const WORKSPACE_LOCKED_RE =
  /EBUSY|EPERM|ENOTEMPTY|resource busy|locked/i;

export function formatResetError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    err instanceof Error && 'code' in err
      ? String((err as NodeJS.ErrnoException).code)
      : '';

  if (
    code === 'EBUSY' ||
    code === 'EPERM' ||
    code === 'ENOTEMPTY' ||
    WORKSPACE_LOCKED_RE.test(message)
  ) {
    return (
      "Impossible de réinitialiser l'exercice : VS Code ou Cursor est encore ouvert " +
      "sur cet atelier. Fermez complètement l'éditeur (toutes les fenêtres sur cet exercice), " +
      'puis réessayez.'
    );
  }

  return (
    "Impossible de réinitialiser l'exercice pour le moment. " +
    'Réessayez dans quelques instants.'
  );
}
