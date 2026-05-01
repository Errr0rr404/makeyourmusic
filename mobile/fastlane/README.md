# Fastlane Deployment Guide for MakeYourMusic

This directory contains the Fastlane setup for deploying the MakeYourMusic iOS app to the App Store. Since MakeYourMusic is an **Expo/React Native** app, this setup wraps `eas build` and `eas submit` commands alongside fastlane's `deliver` for metadata management.

## Directory Structure

```
fastlane/
├── Appfile                      # App configuration (bundle ID, team, Apple ID)
├── Fastfile                     # Build and deployment lanes
├── screenshots.sh               # iPhone screenshot capture script
├── screenshots-ipad.sh          # iPad screenshot capture script
├── metadata/
│   └── en-US/
│       ├── name.txt             # App name in App Store
│       ├── subtitle.txt         # App subtitle
│       ├── description.txt       # Full app description
│       ├── keywords.txt         # Search keywords (comma-separated)
│       ├── promotional_text.txt # Short promotional text
│       ├── release_notes.txt    # What's new in this version
│       ├── marketing_url.txt    # Marketing website URL
│       ├── support_url.txt      # Support/help URL
│       ├── privacy_url.txt     # Privacy policy URL
│       └── review_information/
│           ├── first_name.txt
│           ├── last_name.txt
│           ├── phone_number.txt
│           ├── email_address.txt
│           ├── demo_user.txt
│           ├── demo_password.txt
│           └── notes.txt
└── screenshots/
    └── en-US/                   # App Store screenshots go here
```

## Prerequisites

1. **Install Fastlane:**
   ```bash
   cd mobile
   gem install fastlane
   ```

2. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

3. **Login to EAS:**
   ```bash
   eas login
   ```

4. **Configure iOS Credentials:**
   ```bash
   eas credentials --platform ios
   ```

5. **Set Environment Variables (for App Store Connect API):**
   ```bash
   export ASC_KEY_ID="your_key_id"
   export ASC_ISSUER_ID="your_issuer_id"
   export ASC_KEY_PATH="/path/to/your/key.p8"
   ```

## Usage

All commands are run from the `mobile/` directory.

### Build Commands

```bash
# Build for iOS Simulator (development)
fastlane build_simulator

# Build for internal testing (TestFlight internal users)
fastlane build_internal

# Build for production (TestFlight external + App Store)
fastlane build_production
```

### Deployment Commands

```bash
# Upload metadata and screenshots only (no binary)
# Useful when you've already uploaded a build
fastlane metadata

# Full release: build + upload + submit for review
fastlane release
```

### Screenshot Capture

```bash
# Capture iPhone screenshots
./fastlane/screenshots.sh

# Capture iPad screenshots
./fastlane/screenshots-ipad.sh
```

**Screenshot Instructions:**
1. Run the script
2. Wait for Simulator to boot and open
3. Navigate to the first screen you want to capture
4. Press **ENTER** to take a screenshot
5. Navigate to next screen, press **ENTER** again
6. Type **done** when finished

Screenshots are saved to `fastlane/screenshots/en-US/` with naming:
- iPhone: `iPhone_69-01.png`, `iPhone_69-02.png`, etc.
- iPad: `iPad_Pro_129-01.png`, `iPad_Pro_129-02.png`, etc.

## Fastfile Lanes Explained

| Lane | Description |
|------|-------------|
| `api_key` | Configures App Store Connect API authentication using environment variables |
| `build_simulator` | Builds for iOS Simulator using `eas build --profile development-simulator` |
| `build_internal` | Builds for internal TestFlight testing using `eas build --profile preview` |
| `build_production` | Production build using `eas build --profile production` |
| `metadata` | Uploads metadata and screenshots to App Store Connect (no binary) |
| `release` | Full release: builds, uploads, and submits for Apple review |

## Appfile Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `app_identifier` | `com.worldofz.makeyourmusic` | iOS bundle identifier |
| `apple_id` | `zan.sheum@gmail.com` | Apple Developer account email |
| `team_id` | `KM7J5QCANN` | Apple Developer Team ID |
| `itc_team_id` | `KM7J5QCANN` | App Store Connect Team ID |

## Environment Variables

For automated builds and App Store Connect API access:

```bash
# App Store Connect API Key (for fastlane deliver)
export ASC_KEY_ID="your_key_id"
export ASC_ISSUER_ID="your_issuer_id"
export ASC_KEY_PATH="/path/to/AuthKey_your_key_id.p8"
```

## EAS Build Profiles

The `eas.json` file defines build profiles:

| Profile | Purpose |
|---------|---------|
| `development` | Development builds with dev client |
| `development-simulator` | Simulator builds for local testing |
| `preview` | Internal testing builds |
| `production` | Production builds for App Store |

## Updating App Store Listing

1. Edit metadata files in `fastlane/metadata/en-US/`
2. Run `fastlane metadata` to upload changes
3. Or include with release: `fastlane release`

## Troubleshooting

**Build fails with signing errors:**
```bash
eas credentials --platform ios
```

**Need to regenerate screenshots:**
```bash
./fastlane/screenshots.sh
```

**Metadata upload fails:**
Ensure `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_PATH` are set.

**Check build status:**
```bash
eas build:list
```
