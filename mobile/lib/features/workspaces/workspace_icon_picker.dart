import 'package:flutter/material.dart';

import '../../core/constants/workspace_avatar_presets.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/workspace_logo.dart';
import '../../shared/widgets/workspace_avatar.dart';

class WorkspaceIconPicker extends StatelessWidget {
  const WorkspaceIconPicker({
    super.key,
    required this.name,
    required this.logoPreview,
    required this.canEdit,
    required this.onLogoChanged,
    this.uploading = false,
  });

  final String name;
  final String? logoPreview;
  final bool canEdit;
  final bool uploading;
  final ValueChanged<String?> onLogoChanged;

  Future<void> _upload(BuildContext context) async {
    try {
      final dataUrl = await pickWorkspaceLogoDataUrl();
      onLogoChanged(dataUrl);
    } on WorkspaceLogoException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedPreset = findPresetByDataUrl(logoPreview);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'WORKSPACE ICON',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppColors.textMuted,
                letterSpacing: 0.8,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                WorkspaceAvatar(
                  logoUrl: logoPreview,
                  name: name,
                  size: 64,
                  borderRadius: 14,
                ),
                if (uploading)
                  const Positioned.fill(
                    child: ColoredBox(
                      color: Color(0x66000000),
                      child: Center(
                        child: SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: canEdit
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextButton.icon(
                          onPressed: uploading ? null : () => _upload(context),
                          icon: const Icon(Icons.image_outlined, size: 18),
                          label: Text(logoPreview == null ? 'Upload image' : 'Change image'),
                        ),
                        Text(
                          'PNG, JPG up to 100KB. Optional.',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.textMuted,
                              ),
                        ),
                        if (logoPreview != null)
                          TextButton(
                            onPressed: uploading ? null : () => onLogoChanged(null),
                            child: const Text('Remove icon'),
                          ),
                      ],
                    )
                  : Row(
                      children: [
                        const Icon(Icons.shield_outlined, size: 16, color: AppColors.textMuted),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Only the workspace owner can change the icon.',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.textMuted,
                                ),
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
        if (canEdit) ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            'Preset icons',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: kWorkspaceAvatarPresets.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 6,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
            ),
            itemBuilder: (context, index) {
              final preset = kWorkspaceAvatarPresets[index];
              final selected = selectedPreset?.id == preset.id;
              return InkWell(
                onTap: uploading ? null : () => onLogoChanged(preset.dataUrl),
                borderRadius: BorderRadius.circular(12),
                child: Ink(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected ? AppColors.primary : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return WorkspacePresetAvatar(
                        preset: preset,
                        size: constraints.maxWidth,
                        borderRadius: 10,
                      );
                    },
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Pick a preset or upload your own image above.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
        ],
      ],
    );
  }
}
