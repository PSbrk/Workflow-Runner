@echo off
rem Regenerate public\builtin-workflows.js from whatever JSON files live in
rem workflows\. Run this on the dev machine whenever you want to refresh
rem the set of example templates that get auto-seeded on first launch.
rem Requires Python in PATH (any Python 3).

python -c "import json, os; wfs=[]; [wfs.append(json.load(open(os.path.join('workflows',f), encoding='utf-8'))) for f in sorted(os.listdir('workflows')) if f.endswith('.json')]; out='// Auto-generated bootstrap templates for client-side mode (Option D).\n// Seeded into localStorage on first launch by templates.js.\n// Regenerate by running setup-builtins.cmd.\n\nglobalThis.WfrBuiltinTemplates = '+json.dumps(wfs, indent=2, ensure_ascii=False)+';\n'; open('public/builtin-workflows.js','w',encoding='utf-8',newline='').write(out); print('Wrote', len(wfs), 'templates to public/builtin-workflows.js')"
