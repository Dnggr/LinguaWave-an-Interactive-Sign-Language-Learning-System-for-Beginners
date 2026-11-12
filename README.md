# LinguaWave

**LinguaWave: An Interactive Sign Language Learning System for Beginners**  
Capstone Project 2026 · Colegio de San Gabriel Arcangel, Inc.

LinguaWave is a web-based learning system for beginners studying **American Sign Language (ASL)**. It combines visual lessons, camera-based signing practice, quizzes, learning activities, progress tracking, and feedback. The system is designed to support guided, self-paced learning of the ASL alphabet, basic vocabulary and phrases, and simple sentence patterns.

> **Language scope:** LinguaWave teaches American Sign Language (ASL). It does not teach Filipino Sign Language (FSL), and the two languages should not be treated as interchangeable.

## Table of contents

- [Features](#features)
- [Technology](#technology)
- [System requirements](#system-requirements)
- [Getting started](#getting-started)
- [Windows desktop installer](#windows-desktop-installer)
- [Firebase and media-service configuration](#firebase-and-media-service-configuration)
- [Project structure](#project-structure)
- [Scope and limitations](#scope-and-limitations)
- [Project evaluation](#project-evaluation)
- [Evaluation account information](#evaluation-account-information)

## Features

### Learner features

- **Account access** — registration, sign-in, and account-based access using Firebase Authentication.
- **ASL alphabet lessons** — visual references, descriptions, and video demonstrations for letters A–Z.
- **Vocabulary and phrase lessons** — structured beginner material for common ASL words and expressions.
- **Sentence construction** — activities introducing simple ASL sentence patterns.
- **Camera practice and sign recognition** — webcam-based hand tracking and basic recognition practice for supported signs.
- **Quizzes and learning games** — interactive activities that reinforce lesson content and provide scores or feedback.
- **Progress tracking** — records learning activity and presents progress and achievement information.
- **Feedback** — a survey/feedback feature for collecting learner comments and evaluations.

### Administrator features

- Manage learner accounts and review user-related information.
- Manage learning content and lesson media.
- Review submitted feedback and system reports.
- Monitor learning activity and progress records.

The administrator tools and media-upload workflow depend on the project's configured Firebase and Cloudflare services.

## Technology

| Area | Technology / component | Purpose |
|---|---|---|
| Frontend | HTML5, CSS3, JavaScript | Web interface, lessons, navigation, and application logic |
| Browser-based vision | MediaPipe Tasks Vision | Camera input and hand-landmark tracking for signing practice |
| Gesture models | TensorFlow.js and project model assets | Browser-side processing/classification for supported sign-practice activities |
| Authentication | Firebase Authentication | User registration and sign-in |
| Database | Cloud Firestore | User information, learning records, progress, and application data |
| Desktop launcher | Go | Serves the bundled web app on the local machine and opens it in the browser |
| Windows installer | Inno Setup | Packages the Windows launcher and application files into an installer |
| Version control | Git and GitHub | Source-code collaboration and release distribution |

The web frontend does not require a JavaScript framework or frontend build step. The Go component is used for the optional desktop package; it is not a replacement for Firebase as the application's cloud backend.

## System requirements

### Web application

- A desktop or laptop computer with a modern browser.
- Internet access for Firebase sign-in, Firestore synchronization, Google sign-in, and configured cloud services.
- A working webcam and permission to use it for camera-based practice.
- A browser that supports modern JavaScript modules, webcam access, and WebAssembly.
- For a hosted deployment, serve the application over HTTPS so browser camera and service-worker features can operate in a secure context. `localhost` is suitable for local development.

### Windows desktop package

- 64-bit Windows 10 or Windows 11.
- A modern web browser available on the computer; the desktop launcher opens LinguaWave in the default browser.
- Internet access for Firebase and other cloud-dependent features.
- A webcam for camera-based practice.

The capstone documentation identifies a computer/laptop, webcam, and internet/network connection as relevant hardware resources. It does not specify minimum CPU, RAM, or GPU values.

## Getting started

### Run the web application locally

The frontend is served as static files. No `npm install` or frontend bundling step is required for the standard local run.

1. Clone the repository:

   ```bash
   git clone https://github.com/Dnggr/LinguaWave-an-Interactive-Sign-Language-Learning-System-for-Beginners.git
   cd LinguaWave-an-Interactive-Sign-Language-Learning-System-for-Beginners
   ```

2. Start a local static file server from the project root. For example, with Python 3:

   ```bash
   python3 -m http.server 5500
   ```

3. Open the application in a browser:

   ```text
   http://localhost:5500/
   ```

4. When using camera practice, grant the browser permission to access the webcam.

To stop the Python server, return to the terminal and press `Ctrl+C`.

### Run with the Go local server (developer / desktop-launcher testing)

Go 1.22 or a compatible newer Go release is required to build or run the launcher from source.

```bash
cd desktop-packaging
go run . -root .. -addr 127.0.0.1:5500
```

The launcher serves the project root and opens the default browser. Press `Ctrl+C` in the terminal to stop this development run.

## Windows desktop installer

A Windows installer is published through the repository's GitHub Releases page:

**[Download LinguaWave from GitHub Releases](https://github.com/Dnggr/LinguaWave-an-Interactive-Sign-Language-Learning-System-for-Beginners/releases)**

### Install and launch

1. Open the GitHub Releases page and download `LinguaWave-Setup.exe`.
2. Run the installer and follow the setup wizard.
3. Launch **LinguaWave** from the Windows Start Menu.
4. The Go launcher starts a local server and opens LinguaWave in the default browser at `http://localhost:5500/`.

### Exit the desktop application

Closing the browser tab does **not** stop the local server. To stop LinguaWave, select **Exit LinguaWave** from the Windows Start Menu. This sends a local authenticated shutdown request and stops the server gracefully.

### Verify the installer download

The release also includes `LinguaWave-Setup.exe.sha256`. After downloading both files into the same folder, verify the installer on Linux with:

```bash
sha256sum -c LinguaWave-Setup.exe.sha256
```

The SHA-256 checksum for the published build at the time this README was prepared is:

```text
aa6041b93c0561bbdc73de425ae520b355e15c3e13fe36090c880211eda09227
```

**Testing note:** The installer, launch flow, graceful shutdown, and uninstallation were tested in a Linux environment using Wine. Native Windows 10/11 testing has not yet been completed; verify the installer on a Windows computer before treating this build as a fully Windows-validated release.

## Firebase and media-service configuration

The application relies on project-specific cloud configuration. Before running a separate deployment or development copy:

1. Configure the Firebase web application settings used by the frontend.
2. Enable the Firebase Authentication providers used by the project (email/password and Google sign-in).
3. Configure Cloud Firestore and deploy the repository's applicable security rules and indexes.
4. Configure any Firebase Functions used by the application, if enabled in the deployment.

## Project structure

```text
LinguaWave/
├── index.html                 # Main entry page
├── pages/                     # Learner, administrator, lesson, quiz, and activity pages
├── css/                       # Shared and page-specific stylesheets
├── js/                        # Authentication, learning modules, games, progress, admin, and camera logic
│   ├── camera/                # Camera utilities
│   ├── engine/                # Lesson/game and recognition logic
│   └── tracking/              # MediaPipe and tracking integration
├── assets/                    # Images, icons, videos, and MediaPipe assets
├── asl_static_model/          # Static-sign model resources
├── asl_motion_model/          # Motion-sign model resources
├── sw.js                      # Service worker for selected runtime assets
├── functions/                 # Firebase Functions source
├── scripts/                   # Development and maintenance scripts
├── firebase.json              # Firebase project/deployment configuration
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore index configuration
└── desktop-packaging/         # Go launcher and Inno Setup configuration
    ├── main.go
    ├── go.mod
    └── installer/
        └── LinguaWave.iss
```

Generated desktop build outputs (for example, staging, release, installer output, and compiled executables) are not part of the source-code tree committed to Git. Download the packaged Windows installer from GitHub Releases.

## Scope and limitations

- LinguaWave focuses on **American Sign Language (ASL)**. It does not provide FSL or other sign-language curricula.
- The learning content targets beginner to basic-intermediate learners. Advanced grammar, complex discourse, and professional interpreter training are outside the system's scope.
- Camera-based recognition is limited to supported ASL alphabet, vocabulary, and simple phrase gestures. It is not a general-purpose sign-language translator and does not assess continuous or free-form sentence signing.
- Recognition results may vary with camera quality, lighting, framing, and hand positioning.
- Assessments consist of multiple-choice quizzes, basic motion-practice checks, and surveys. The system does not provide certified or interpreter-grade performance assessment.
- The service worker does not make the entire application fully offline. Firebase authentication, cloud synchronization, Google sign-in, and configured cloud services require internet access.

## Project evaluation

The capstone documentation reports an evaluation involving 20 respondents using ISO 9126 software quality metrics. The reported overall weighted mean was **4.5 (Agree)**. The reported metric means were Functionality **4.68**, Reliability **4.30**, Usability **4.49**, and Efficiency **4.53**. These are the study's reported respondent-evaluation results, not a guarantee of performance on every device or network.

## Evaluation account information

For the school's offline capstone handover copy, complete the following with the actual demonstration accounts approved for evaluators:

| Account | Username / email | Password |
|---|---|---|
| Learner demonstration account | `[Add approved learner account]` | `[Provide in the restricted handover copy]` |
| Administrator demonstration account | `[Add approved administrator account]` | `[Provide in the restricted handover copy]` |

**Security:** Do not replace these placeholders with live passwords in the public GitHub README. Put evaluator credentials only in the authorized, offline handover copy or provide them to evaluators through the institution-approved secure method.
