package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

const healthPath = "/__linguawave_health"
const shutdownPath = "/__linguawave_shutdown"

func main() {
	if runtime.GOOS == "windows" {
		if logFile, err := openLogFile(); err == nil {
			defer logFile.Close()
			log.SetOutput(logFile)
		}
	}

	if err := run(); err != nil {
		log.Printf("LinguaWave: %v", err)
		os.Exit(1)
	}
}

func run() error {
	rootFlag := flag.String(
		"root", "",
		"Directory containing LinguaWave index.html",
	)
	addrFlag := flag.String(
		"addr", "127.0.0.1:5500",
		"Local address for the web server",
	)
	noBrowserFlag := flag.Bool(
		"no-browser", false,
		"Do not open the browser automatically",
	)
	exitFlag := flag.Bool(
		"exit", false,
		"Stop the running LinguaWave server",
	)
	flag.Parse()

	if *exitFlag {
		return requestShutdown(*addrFlag)
	}

	root, err := resolveContentRoot(*rootFlag)
	if err != nil {
		return err
	}

	registerMIMETypes()

	shutdownRequests := make(chan struct{}, 1)
	var controlToken string

	mux := http.NewServeMux()

	mux.HandleFunc(healthPath, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc(shutdownPath, func(w http.ResponseWriter, r *http.Request) {
		providedToken := r.Header.Get("X-LinguaWave-Token")
		if len(providedToken) != len(controlToken) ||
			subtle.ConstantTimeCompare([]byte(providedToken), []byte(controlToken)) != 1 {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		w.WriteHeader(http.StatusAccepted)
		select {
		case shutdownRequests <- struct{}{}:
		default:
		}
	})

	mux.Handle("/", http.FileServer(http.Dir(root)))

	listener, err := net.Listen("tcp", *addrFlag)
	if err != nil {
		return fmt.Errorf(
			"cannot start local server on %s: %w; "+
				"close the process using this port or choose another -addr",
			*addrFlag, err,
		)
	}

	tokenPath, err := controlTokenPath()
	if err != nil {
		_ = listener.Close()
		return err
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		_ = listener.Close()
		return fmt.Errorf("could not generate shutdown token: %w", err)
	}

	controlToken = hex.EncodeToString(tokenBytes)
	if err := os.WriteFile(tokenPath, []byte(controlToken), 0600); err != nil {
		_ = listener.Close()
		return fmt.Errorf("could not save shutdown token: %w", err)
	}
	defer os.Remove(tokenPath)

	server := &http.Server{
		Handler:           localOnly(mux),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	serverErr := make(chan error, 1)

	go func() {
		serverErr <- server.Serve(listener)
	}()

	_, port, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		_ = server.Close()
		return fmt.Errorf("could not determine server port: %w", err)
	}

	appURL := "http://localhost:" + port + "/"

	if err := waitForServer(
		"http://localhost:"+port+healthPath,
		5*time.Second,
	); err != nil {
		_ = server.Close()
		return err
	}

	fmt.Printf("LinguaWave is running from: %s\n", root)
	fmt.Printf("Open: %s\n", appURL)
	fmt.Println("Press Ctrl+C to stop LinguaWave.")

	if !*noBrowserFlag {
		if err := openBrowser(appURL); err != nil {
			log.Printf("Could not open browser automatically: %v", err)
			fmt.Printf("Open this address manually: %s\n", appURL)
		}
	}

	select {
	case err := <-serverErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("web server stopped unexpectedly: %w", err)
		}
		return nil

	case <-shutdownRequests:
		return shutdownServer(server)

	case <-ctx.Done():
		return shutdownServer(server)
	}
}

func resolveContentRoot(requested string) (string, error) {
	var candidates []string

	if requested != "" {
		abs, err := filepath.Abs(requested)
		if err != nil {
			return "", fmt.Errorf("invalid content directory: %w", err)
		}
		candidates = append(candidates, abs)
	} else {
		if executable, err := os.Executable(); err == nil {
			exeDir := filepath.Dir(executable)
			candidates = append(
				candidates,
				filepath.Join(exeDir, "app"),
				exeDir,
			)
		}

		if cwd, err := os.Getwd(); err == nil {
			candidates = append(
				candidates,
				filepath.Join(cwd, "app"),
				cwd,
			)
		}
	}

	for _, candidate := range candidates {
		info, err := os.Stat(filepath.Join(candidate, "index.html"))

		if err == nil && !info.IsDir() {
			return filepath.Abs(candidate)
		}
	}

	return "", fmt.Errorf(
		"could not find index.html; pass -root with the path to LinguaWave",
	)
}

func registerMIMETypes() {
	_ = mime.AddExtensionType(".wasm", "application/wasm")
	_ = mime.AddExtensionType(".mp4", "video/mp4")
	_ = mime.AddExtensionType(".mjs", "text/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".webmanifest", "application/manifest+json")
	_ = mime.AddExtensionType(".task", "application/octet-stream")
}

func localOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isLoopbackRemoteAddr(r.RemoteAddr) || !isAllowedHost(r.Host) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		if r.URL.Path == shutdownPath {
			if r.Method != http.MethodPost {
				w.Header().Set("Allow", "POST")
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}
		} else if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		if r.URL.Path == "/" ||
			strings.HasSuffix(strings.ToLower(r.URL.Path), ".html") ||
			r.URL.Path == "/sw.js" {
			w.Header().Set("Cache-Control", "no-cache")
		}

		next.ServeHTTP(w, r)
	})
}

func isLoopbackRemoteAddr(remoteAddr string) bool {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return false
	}

	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func isAllowedHost(hostport string) bool {
	host := hostport

	if parsedHost, _, err := net.SplitHostPort(hostport); err == nil {
		host = parsedHost
	}

	host = strings.Trim(strings.ToLower(host), "[]")

	return host == "localhost" || host == "127.0.0.1"
}

func appStateDir() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", fmt.Errorf("could not locate the user cache directory: %w", err)
	}

	appDir := filepath.Join(cacheDir, "LinguaWave")
	if err := os.MkdirAll(appDir, 0700); err != nil {
		return "", fmt.Errorf("could not create the LinguaWave state directory: %w", err)
	}

	return appDir, nil
}

func controlTokenPath() (string, error) {
	appDir, err := appStateDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(appDir, "control.token"), nil
}

func openLogFile() (*os.File, error) {
	appDir, err := appStateDir()
	if err != nil {
		return nil, err
	}
	return os.OpenFile(filepath.Join(appDir, "linguawave.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
}

func requestShutdown(addr string) error {
	_, port, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("invalid server address %q: %w", addr, err)
	}

	tokenPath, err := controlTokenPath()
	if err != nil {
		return err
	}

	tokenBytes, err := os.ReadFile(tokenPath)
	if err != nil {
		return fmt.Errorf("no active LinguaWave shutdown token found: %w", err)
	}

	token := strings.TrimSpace(string(tokenBytes))
	if token == "" {
		return errors.New("LinguaWave shutdown token is empty")
	}

	req, err := http.NewRequest(http.MethodPost, "http://127.0.0.1:"+port+shutdownPath, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-LinguaWave-Token", token)

	client := &http.Client{Timeout: 2 * time.Second}
	response, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("could not contact LinguaWave: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusAccepted {
		return fmt.Errorf("LinguaWave rejected shutdown request (HTTP %d)", response.StatusCode)
	}
	return nil
}

func shutdownServer(server *http.Server) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		_ = server.Close()
		return fmt.Errorf("could not shut down cleanly: %w", err)
	}
	return nil
}

func waitForServer(url string, timeout time.Duration) error {
	client := &http.Client{
		Timeout: 500 * time.Millisecond,
	}

	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		response, err := client.Get(url)

		if err == nil {
			_ = response.Body.Close()

			if response.StatusCode == http.StatusNoContent {
				return nil
			}
		}

		time.Sleep(100 * time.Millisecond)
	}

	return fmt.Errorf(
		"local server did not become ready within %s",
		timeout,
	)
}

func openBrowser(target string) error {
	var command *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		command = exec.Command(
			"rundll32",
			"url.dll,FileProtocolHandler",
			target,
		)

	case "darwin":
		command = exec.Command("open", target)

	default:
		command = exec.Command("xdg-open", target)
	}

	return command.Start()
}
