import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config({ignores:['dist/**','dist-electron/**','release/**','node_modules/**','src/visuals/milkdrop/presets.generated.js']},...tseslint.configs.recommended,{languageOptions:{globals:{...globals.browser,...globals.node}},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}});
