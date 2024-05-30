import path from 'node:path';

export async function copyActionFiles(actionDir: string) {
  const tmpDir = tmpdir();

  // Copy over all relevant action files
  await fs.copy(
    path.join(actionDir, 'action.yml'),
    path.join(tmpDir, 'action.yml')
  );

  if (await fs.exists(path.join(actionDir, 'dist')))
    await fs.copy(path.join(actionDir, 'dist'), path.join(tmpDir, 'dist'));

  if (await fs.exists(path.join(actionDir, 'README.md')))
    await fs.copy(
      path.join(actionDir, 'README.md'),
      path.join(tmpDir, 'README.md')
    );

  return tmpDir;
}
