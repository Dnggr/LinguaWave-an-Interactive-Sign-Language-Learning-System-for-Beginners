#define MyAppName "LinguaWave"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "LinguaWave"

[Setup]
AppId={{A8E3D1C2-7F45-4B91-9C62-5D8A2F13B640}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}

DefaultDirName={localappdata}\Programs\LinguaWave
DefaultGroupName=LinguaWave
PrivilegesRequired=lowest

ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

OutputDir=Output
OutputBaseFilename=LinguaWave-Setup

SetupIconFile=..\release\LinguaWave\app\assets\icon\favicon.ico
UninstallDisplayIcon={app}\app\assets\icon\favicon.ico

Compression=lzma2
SolidCompression=yes
WizardStyle=modern

DisableProgramGroupPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; \
    GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\release\LinguaWave\LinguaWave.exe"; \
    DestDir: "{app}"; Flags: ignoreversion

Source: "..\release\LinguaWave\app\*"; \
    DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\LinguaWave"; \
    Filename: "{app}\LinguaWave.exe"; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\app\assets\icon\favicon.ico"

Name: "{autoprograms}\Exit LinguaWave"; \
    Filename: "{app}\LinguaWave.exe"; \
    Parameters: "-exit"; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\app\assets\icon\favicon.ico"

Name: "{autodesktop}\LinguaWave"; \
    Filename: "{app}\LinguaWave.exe"; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\app\assets\icon\favicon.ico"; \
    Tasks: desktopicon

[Run]
Filename: "{app}\LinguaWave.exe"; \
    Description: "Launch LinguaWave"; \
    Flags: nowait postinstall skipifsilent
