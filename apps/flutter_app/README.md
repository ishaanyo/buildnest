# BuildNest Flutter App

## Fix missing Android / iOS folders

The repo only contains `lib/` + `pubspec.yaml`. Generate platforms once:

```bash
cd apps/flutter_app
flutter create . --project-name buildnest
flutter pub get
```

## Point to production API

Default is already:

`https://buildnest-sigma.vercel.app`

Or:

```bash
flutter run --dart-define=API_BASE=https://buildnest-sigma.vercel.app
```

## Android permissions

After `flutter create`, edit `android/app/src/main/AndroidManifest.xml` and add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
```

## iOS (if needed)

In `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Take a photo of your room for AI design</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Pick a room photo or plot map</string>
```

## Run

```bash
flutter run
```
