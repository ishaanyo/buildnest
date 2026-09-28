# BuildNest Flutter App

## Run

```bash
flutter pub get
flutter run
```

## API base URL

Default in `lib/services/api_service.dart`:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: your machine LAN IP or Vercel URL

Override at build time:

```bash
flutter run --dart-define=API_BASE=https://your-app.vercel.app
```

## Permissions

**Android** (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
```

**iOS** (`ios/Runner/Info.plist`):

```xml
<key>NSCameraUsageDescription</key>
<string>Take a photo of your room for AI design</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Pick a room photo or plot map</string>
```

Create the Flutter platform folders with:

```bash
flutter create . --project-name buildnest
```

(then keep the `lib/` and `pubspec.yaml` we already wrote).
