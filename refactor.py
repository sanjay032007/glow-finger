import re

filepath = 'c:/Users/sanjay/.gemini/antigravity/brain/45038082-faa5-4fff-8144-1681601141c1/exm/glow-finger/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove dead envMode state, cycleEnvironment handler, and EnvMode import
code = re.sub(r"import type \{ EnvMode \} from '\./components/Environments';\n", "", code)
code = re.sub(r"  const \[envMode, setEnvMode\] = useState<EnvMode>\('NEON'\);\n", "", code)
code = re.sub(r"  const cycleEnvironment = \(\) => \{[\s\S]*?return 'NEON';\n    \}\);\n  \};\n", "", code)
code = re.sub(r"\s*<button\s+onClick=\{cycleEnvironment\}[\s\S]*?<ImageIcon size=\{20\} />\s*</button>", "", code)

# 2. Remove dead theme !== 'PAPERCRAFT' conditional branches
code = re.sub(r"\s*\{theme !== 'PAPERCRAFT' && <div className=\"absolute inset-0 z-0 bg-\[url\('data:image/svg\+xml;base64,.*?'\)\] opacity-30 pointer-events-none\"></div>\}", "", code)
code = re.sub(r"\s*\{theme !== 'PAPERCRAFT' && \([\s\S]*?\)\}", "", code)

# Ternaries replacements
code = re.sub(r"theme === 'PAPERCRAFT' \? '([^']+)' : '([^']+)'", r"'\1'", code)
code = re.sub(r'theme === ' + r"'PAPERCRAFT' \? \"([^\"]+)\" : \"([^\"]+)\"", r'"\1"', code)
code = re.sub(r"theme === 'PAPERCRAFT' \? ([0-9\.]+) \+ opacity : ([0-9\.]+) \* opacity", r"\1 + opacity", code)
code = re.sub(r"theme === 'PAPERCRAFT' \? ([0-9\.]+) \* opacity : ([0-9\.]+) \* opacity", r"\1 * opacity", code)
code = re.sub(r"theme === 'PAPERCRAFT' \? ([0-9\.]+) : ([0-9\.]+)", r"\1", code)
code = re.sub(r"\{theme === 'PAPERCRAFT' \? '([^']+)' : '([^']+)'\}", r"'\1'", code)
code = re.sub(r"\$\{theme === 'PAPERCRAFT' \? '([^']+)' : '([^']+)'\}", r"\1", code)
code = re.sub(r"theme === 'PAPERCRAFT' \? '([^']+)' : `([^`]+)`", r"'\1'", code)

code = re.sub(r"\{theme === 'PAPERCRAFT' \? \(\s*(<meshStandardMaterial[\s\S]*?/>)\s*\)\s*:\s*\([\s\S]*?<meshPhysicalMaterial[\s\S]*?/>\s*\)\}", r"\1", code)
code = re.sub(r"\{theme === 'PAPERCRAFT' \? \(\s*(<>\s*<ambientLight[\s\S]*?/>\s*</>)\s*\)\s*:\s*null\}", r"\1", code)

# /* Leftover Mode Toggle Removed */
code = code.replace("      /* Leftover Mode Toggle Removed */\n", "")
code = code.replace("      /* Leftover Mode Toggle Removed */", "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Refactored App.tsx")
