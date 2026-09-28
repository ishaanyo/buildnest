import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AppState extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<ThemeModel> themes = [];
  bool loadingThemes = false;
  String? error;

  File? selectedImage;
  String? uploadedUrl;
  ThemeModel? selectedTheme;
  String roomType = 'living';
  bool processing = false;
  ProjectModel? project;
  OrderModel? order;
  bool includeLabor = true;

  Future<void> loadThemes() async {
    loadingThemes = true;
    error = null;
    notifyListeners();
    try {
      themes = await _api.getThemes();
    } catch (e) {
      error = e.toString();
      // Offline / no backend yet — provide local fallbacks so UI works
      themes = _fallbackThemes;
    } finally {
      loadingThemes = false;
      notifyListeners();
    }
  }

  void setImage(File file) {
    selectedImage = file;
    uploadedUrl = null;
    project = null;
    order = null;
    notifyListeners();
  }

  void selectTheme(ThemeModel t) {
    selectedTheme = t;
    notifyListeners();
  }

  void setRoomType(String t) {
    roomType = t;
    notifyListeners();
  }

  void setIncludeLabor(bool v) {
    includeLabor = v;
    notifyListeners();
  }

  Future<void> generateDesign() async {
    if (selectedImage == null || selectedTheme == null) {
      error = 'Please select an image and a theme';
      notifyListeners();
      return;
    }
    processing = true;
    error = null;
    project = null;
    notifyListeners();

    try {
      uploadedUrl = await _api.uploadImage(selectedImage!);
      project = await _api.createProject(
        sourceImageUrl: uploadedUrl!,
        themeSlug: selectedTheme!.slug,
        roomType: roomType,
      );
    } catch (e) {
      error = e.toString();
    } finally {
      processing = false;
      notifyListeners();
    }
  }

  Future<void> placeOrder() async {
    if (project == null) return;
    processing = true;
    error = null;
    notifyListeners();
    try {
      order = await _api.createOrder(
        projectId: project!.id,
        includeLabor: includeLabor,
      );
    } catch (e) {
      error = e.toString();
    } finally {
      processing = false;
      notifyListeners();
    }
  }

  static final _fallbackThemes = [
    ThemeModel(id: '1', slug: 'modern', name: 'Modern', description: 'Clean lines, neutral palette', prompt: ''),
    ThemeModel(id: '2', slug: 'minimalist', name: 'Minimalist', description: 'Less is more', prompt: ''),
    ThemeModel(id: '3', slug: 'luxury', name: 'Luxury', description: 'Opulent finishes', prompt: ''),
    ThemeModel(id: '4', slug: 'scandinavian', name: 'Scandinavian', description: 'Light woods, hygge', prompt: ''),
    ThemeModel(id: '5', slug: 'industrial', name: 'Industrial', description: 'Raw materials', prompt: ''),
    ThemeModel(id: '6', slug: 'boho', name: 'Bohemian', description: 'Eclectic layers', prompt: ''),
    ThemeModel(id: '7', slug: 'japanese', name: 'Japanese Zen', description: 'Calm & natural', prompt: ''),
    ThemeModel(id: '8', slug: 'coastal', name: 'Coastal', description: 'Beach house vibes', prompt: ''),
  ];
}
