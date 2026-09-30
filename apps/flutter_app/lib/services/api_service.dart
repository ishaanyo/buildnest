import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/models.dart';

/// Production Vercel API. Override with:
/// flutter run --dart-define=API_BASE=https://other-url.vercel.app
const String kBaseUrl = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'https://buildnest-sigma.vercel.app',
);

class ApiService {
  final String baseUrl;
  ApiService({this.baseUrl = kBaseUrl});

  Future<List<ThemeModel>> getThemes() async {
    final res = await http.get(Uri.parse('$baseUrl/api/themes'));
    if (res.statusCode != 200) throw Exception('Failed to load themes: ${res.body}');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['themes'] as List<dynamic>;
    return list.map((e) => ThemeModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> uploadImage(File file) async {
    final req = http.MultipartRequest('POST', Uri.parse('$baseUrl/api/upload'));
    req.files.add(await http.MultipartFile.fromPath('file', file.path));
    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode != 200) throw Exception('Upload failed: ${res.body}');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return data['url'] as String;
  }

  Future<ProjectModel> createProject({
    required String sourceImageUrl,
    required String themeSlug,
    String? roomType,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/projects'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'sourceImageUrl': sourceImageUrl,
        'themeSlug': themeSlug,
        if (roomType != null) 'roomType': roomType,
      }),
    );
    if (res.statusCode != 200) {
      throw Exception('Project failed: ${res.body}');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return ProjectModel.fromJson(data['project'] as Map<String, dynamic>);
  }

  Future<OrderModel> createOrder({
    required String projectId,
    bool includeLabor = true,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/orders'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'projectId': projectId,
        'includeLabor': includeLabor,
      }),
    );
    if (res.statusCode != 200) throw Exception('Order failed: ${res.body}');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return OrderModel.fromJson(data['order'] as Map<String, dynamic>);
  }
}
