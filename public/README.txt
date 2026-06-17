Put the brand logo here as:  logo.png   (this folder = infra-website/public/)

It is used as:
- Browser favicon + apple-touch-icon (see index.html)
- Sidebar + Login logo in the admin portal (referenced as /logo.png)

Vite serves everything in /public at the site root, so /public/logo.png → /logo.png.
After adding the file, rebuild:  npm run build

MOBILE APP ICON (separate):
The React-Native app icon needs PNGs in several sizes under
  infra/android/app/src/main/res/mipmap-*/ic_launcher.png
Generate them from the logo with Android Studio (Image Asset) or
https://icon.kitchen / https://easyappicon.com, then replace the mipmap files
and rebuild the APK.
