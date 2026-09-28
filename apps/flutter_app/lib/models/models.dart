class ThemeModel {
  final String id;
  final String slug;
  final String name;
  final String? description;
  final String? thumbnail;
  final String prompt;

  ThemeModel({
    required this.id,
    required this.slug,
    required this.name,
    this.description,
    this.thumbnail,
    required this.prompt,
  });

  factory ThemeModel.fromJson(Map<String, dynamic> j) => ThemeModel(
        id: j['id'] as String,
        slug: j['slug'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        thumbnail: j['thumbnail'] as String?,
        prompt: j['prompt'] as String? ?? '',
      );
}

class MaterialLine {
  final String materialId;
  final String sku;
  final String name;
  final String category;
  final String unit;
  final double quantity;
  final double unitPrice;
  final double total;

  MaterialLine({
    required this.materialId,
    required this.sku,
    required this.name,
    required this.category,
    required this.unit,
    required this.quantity,
    required this.unitPrice,
    required this.total,
  });

  factory MaterialLine.fromJson(Map<String, dynamic> j) => MaterialLine(
        materialId: j['materialId'] as String,
        sku: j['sku'] as String,
        name: j['name'] as String,
        category: j['category'] as String,
        unit: j['unit'] as String,
        quantity: (j['quantity'] as num).toDouble(),
        unitPrice: (j['unitPrice'] as num).toDouble(),
        total: (j['total'] as num).toDouble(),
      );
}

class ProjectModel {
  final String id;
  final String sourceImageUrl;
  final List<String> resultImageUrls;
  final String status;
  final double? materialCost;
  final double? laborCost;
  final double? totalCost;
  final List<MaterialLine> materialBreakdown;
  final String? roomType;
  final String? notes;
  final ThemeModel? theme;

  ProjectModel({
    required this.id,
    required this.sourceImageUrl,
    required this.resultImageUrls,
    required this.status,
    this.materialCost,
    this.laborCost,
    this.totalCost,
    this.materialBreakdown = const [],
    this.roomType,
    this.notes,
    this.theme,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> j) {
    final breakdown = j['materialBreakdown'];
    List<MaterialLine> lines = [];
    if (breakdown is List) {
      lines = breakdown.map((e) => MaterialLine.fromJson(e as Map<String, dynamic>)).toList();
    }
    return ProjectModel(
      id: j['id'] as String,
      sourceImageUrl: j['sourceImageUrl'] as String,
      resultImageUrls: (j['resultImageUrls'] as List<dynamic>?)?.cast<String>() ?? [],
      status: j['status'] as String,
      materialCost: (j['materialCost'] as num?)?.toDouble(),
      laborCost: (j['laborCost'] as num?)?.toDouble(),
      totalCost: (j['totalCost'] as num?)?.toDouble(),
      materialBreakdown: lines,
      roomType: j['roomType'] as String?,
      notes: j['notes'] as String?,
      theme: j['theme'] != null ? ThemeModel.fromJson(j['theme'] as Map<String, dynamic>) : null,
    );
  }
}

class OrderModel {
  final String id;
  final double materialTotal;
  final double laborTotal;
  final double packageTotal;
  final bool includeLabor;
  final String status;

  OrderModel({
    required this.id,
    required this.materialTotal,
    required this.laborTotal,
    required this.packageTotal,
    required this.includeLabor,
    required this.status,
  });

  factory OrderModel.fromJson(Map<String, dynamic> j) => OrderModel(
        id: j['id'] as String,
        materialTotal: (j['materialTotal'] as num).toDouble(),
        laborTotal: (j['laborTotal'] as num).toDouble(),
        packageTotal: (j['packageTotal'] as num).toDouble(),
        includeLabor: j['includeLabor'] as bool? ?? true,
        status: j['status'] as String,
      );
}
