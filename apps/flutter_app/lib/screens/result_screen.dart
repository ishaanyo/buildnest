import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../theme/app_theme.dart';

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = state.project;
    final fmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    if (p == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('No project yet')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(p.theme?.name ?? 'Your design')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Renders
          if (p.resultImageUrls.isNotEmpty) ...[
            SizedBox(
              height: 240,
              child: PageView.builder(
                itemCount: p.resultImageUrls.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: CachedNetworkImage(
                      imageUrl: p.resultImageUrls[i],
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: AppTheme.surface2),
                      errorWidget: (_, __, ___) => Container(
                        color: AppTheme.surface2,
                        child: const Icon(Icons.image_not_supported),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${p.resultImageUrls.length} AI render${p.resultImageUrls.length > 1 ? 's' : ''}',
              style: TextStyle(color: AppTheme.muted, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
          ],

          // Cost summary
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _costRow('Materials', p.materialCost ?? 0, fmt),
                const SizedBox(height: 10),
                _costRow('Labor', p.laborCost ?? 0, fmt),
                const Divider(height: 28, color: AppTheme.surface2),
                _costRow('Total package', p.totalCost ?? 0, fmt, bold: true),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Material breakdown
          Text('Material list', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ...p.materialBreakdown.map(
            (m) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        Text(
                          '${m.quantity} ${m.unit} · ${m.category}',
                          style: TextStyle(color: AppTheme.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Text(fmt.format(m.total), style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),

          if (p.notes != null) ...[
            const SizedBox(height: 12),
            Text(p.notes!, style: TextStyle(color: AppTheme.muted, fontSize: 12)),
          ],

          const SizedBox(height: 24),
          SwitchListTile(
            value: state.includeLabor,
            onChanged: state.setIncludeLabor,
            title: const Text('Include labor package'),
            subtitle: Text('Professional installation', style: TextStyle(color: AppTheme.muted, fontSize: 13)),
            activeColor: AppTheme.accent,
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 12),

          if (state.order != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.success.withOpacity(0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  const Icon(Icons.check_circle, color: AppTheme.success, size: 36),
                  const SizedBox(height: 8),
                  Text('Order ${state.order!.id.substring(0, 8)}… placed', style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                    'Total ${fmt.format(state.order!.packageTotal)}',
                    style: TextStyle(color: AppTheme.muted),
                  ),
                ],
              ),
            )
          else
            ElevatedButton(
              onPressed: state.processing
                  ? null
                  : () => state.placeOrder(),
              child: state.processing
                  ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(
                      'Buy package · ${fmt.format((p.materialCost ?? 0) + (state.includeLabor ? (p.laborCost ?? 0) : 0))}',
                    ),
            ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _costRow(String label, double value, NumberFormat fmt, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            fontSize: bold ? 17 : 15,
          ),
        ),
        Text(
          fmt.format(value),
          style: TextStyle(
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: bold ? 18 : 15,
            color: bold ? AppTheme.accentSoft : null,
          ),
        ),
      ],
    );
  }
}
