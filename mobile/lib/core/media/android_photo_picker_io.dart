import 'package:image_picker_android/image_picker_android.dart';
import 'package:image_picker_platform_interface/image_picker_platform_interface.dart';

/// Prefer the system photo picker so gallery selection does not need
/// READ_MEDIA_IMAGES / READ_MEDIA_VIDEO (required on Android 13+; optional below).
void enableAndroidPhotoPicker() {
  final implementation = ImagePickerPlatform.instance;
  if (implementation is ImagePickerAndroid) {
    implementation.useAndroidPhotoPicker = true;
  }
}
