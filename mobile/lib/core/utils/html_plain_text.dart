/// Strip HTML tags and entities for list previews and plain-text display.
String stripHtmlToPlainText(String? html) {
  if (html == null || html.isEmpty) return '';

  var text = html;
  for (var i = 0; i < 3; i++) {
    text = _decodeHtmlEntities(text);
    text = _stripHtmlTags(text);
  }

  return text.replaceAll(RegExp(r'\s+'), ' ').trim();
}

String _decodeHtmlEntities(String text) {
  return text
      .replaceAll(RegExp(r'&nbsp;', caseSensitive: false), ' ')
      .replaceAll(RegExp(r'&amp;', caseSensitive: false), '&')
      .replaceAll(RegExp(r'&lt;', caseSensitive: false), '<')
      .replaceAll(RegExp(r'&gt;', caseSensitive: false), '>')
      .replaceAll(RegExp(r'&quot;', caseSensitive: false), '"')
      .replaceAll('&#39;', "'")
      .replaceAll(RegExp(r'&#x27;', caseSensitive: false), "'")
      .replaceAllMapped(RegExp(r'&#(\d+);'), (match) {
        final code = int.tryParse(match.group(1)!);
        return code != null ? String.fromCharCode(code) : match.group(0)!;
      })
      .replaceAllMapped(RegExp(r'&#x([0-9a-f]+);', caseSensitive: false), (match) {
        final code = int.tryParse(match.group(1)!, radix: 16);
        return code != null ? String.fromCharCode(code) : match.group(0)!;
      });
}

String _stripHtmlTags(String text) {
  return text
      .replaceAll(RegExp(r'<script[\s\S]*?>[\s\S]*?<\/script>', caseSensitive: false), ' ')
      .replaceAll(RegExp(r'<style[\s\S]*?>[\s\S]*?<\/style>', caseSensitive: false), ' ')
      .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</div>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'<[^>]+>'), ' ');
}
