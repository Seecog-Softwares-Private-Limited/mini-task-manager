import 'dart:math';

final _random = Random();

String generateClientId() {
  return '${DateTime.now().microsecondsSinceEpoch}_${_random.nextInt(0xFFFFFF).toRadixString(16)}';

}
