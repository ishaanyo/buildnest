import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../theme/app_theme.dart';
import 'result_screen.dart';

class ThemeScreen extends StatelessWidget {
  const ThemeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(title: const Text('Choose a theme')),
      body: Column(
        children: [
          if (state.loadingThemes)
            const LinearProgressIndicator(minHeight: 2, color: AppTheme.accent),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: state.themes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                final t = state.themes[i];
                final selected = state.selectedTheme?.id == t.id;
                return GestureDetector(
                  onTap: () => state.selectTheme(t),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: selected ? AppTheme.accent.withOpacity(0.15) : AppTheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: selected ? AppTheme.accent : AppTheme.surface2,
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AppTheme.surface2,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            _iconFor(t.slug),
                            color: selected ? AppTheme.accentSoft : AppTheme.muted,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                              if (t.description != null)
                                Text(t.description!, style: TextStyle(color: AppTheme.muted, fontSize: 13)),
                            ],
                          ),
                        ),
                        if (selected) const Icon(Icons.check_circle, color: AppTheme.accent),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          if (state.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(state.error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
            ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: ElevatedButton(
              onPressed: state.selectedTheme == null || state.processing
                  ? null
                  : () async {
                      await state.generateDesign();
                      if (context.mounted && state.project != null) {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => const ResultScreen()),
                        );
                      }
                    },
              child: state.processing
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Generate AI design'),
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconFor(String slug) {
    switch (slug) {
      case 'modern':
        return Icons.apartment;
      case 'minimalist':
        return Icons.crop_square;
      case 'luxury':
        return Icons.diamond_outlined;
      case 'scandinavian':
        return Icons.forest_outlined;
      case 'industrial':
        return Icons.factory_outlined;
      case 'boho':
        return Icons.spa_outlined;
      case 'japanese':
        return Icons.temple_buddhist_outlined;
      case 'coastal':
        return Icons.waves;
      default:
        return Icons.palette_outlined;
    }
  }
}
