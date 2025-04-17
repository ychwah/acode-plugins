import tag from 'html-tag-js';
import plugin from '../plugin.json';

import {
    quicktype,
    InputData,
    jsonInputForTargetLanguage,
    JSONSchemaInput,
    TargetLanguage,
    defaultTargetLanguages,
    languageNamed,
    RendererOptions
} from 'quicktype-core';

const alert = acode.require('alert');
const select = acode.require('select');

type InputKind = 'json' | 'schema' | 'typescript';

class AcodePlugin {
    public baseUrl: string | undefined;
    private $page: any;
    private $body: any;
    private $style: any;

    isValidJSON(jsonString: string): boolean {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (e) {
            return false;
        }
    }

    async quicktypeJSON(targetLanguage: string, topLevelName: string, jsonString: string, justTypes: boolean = true, kind: InputKind = 'json') {
        const lang = languageNamed(targetLanguage);

        const rendererOptions: RendererOptions = {};
        if (justTypes) {
            if (lang?.name === 'csharp') {
                rendererOptions.features = 'just-types';
            } else if (lang?.name === 'kotlin') {
                rendererOptions.framework = 'just-types';
            } else {
                rendererOptions['just-types'] = 'true';
            }
        }

        const inputData = new InputData();

        switch (kind) {
            case 'json':
                await inputData.addSource('json', { name: topLevelName, samples: [jsonString] }, () =>
                    jsonInputForTargetLanguage(targetLanguage)
                );
                break;
            case 'schema':
                await inputData.addSource(
                    'schema',
                    { name: topLevelName, schema: jsonString },
                    () => new JSONSchemaInput(undefined)
                );
                break;
            default:
                throw new Error(`Unrecognized input format: ${kind}`);
        }

        return await quicktype({
            inputData,
            lang: targetLanguage,
            rendererOptions
        });

    }

    async quickTypeGenerate(kind: InputKind) {
        const targetLanguageList = defaultTargetLanguages.map(lang => lang.name).sort();
        const targetLanguage = await select('Language', targetLanguageList, {
            onCancel: () => window.toast('Please select a target language.', 4500),
            hideOnSelect: true,
            textTransform: true,
            default: 'typescript',
        });

        try {
            if (targetLanguage) {
                const topLevelName = await prompt('Top-level type name', 'TopLevel', 'text', { required: true });
                const activeFileContent = editorManager.editor.session.getValue();

                if (!this.isValidJSON(activeFileContent)) {
                    alert('JSON is not valid!', 'The json content used is malformed or incorrect.');
                    return;
                }

                const { lines: codeTypeResult } = await this.quicktypeJSON(targetLanguage, topLevelName as string, activeFileContent, true, kind);
                const codeType: TargetLanguage | undefined = languageNamed(targetLanguage);

                acode.newEditorFile(`${topLevelName}.${codeType?.extension}`, {
                    text: codeTypeResult.join('\n'),
                    isUnsaved: true,
                    render: true
                });
            }
        } catch (e) {
            if (e instanceof Error) {
                alert('An unexpected error occured', e.message);
            }
        }
    }

    async init($page: WCPage, cacheFile: any, cacheFileUrl: string): Promise<void> {
        // Welcome Page Title
        $page.settitle("JSON to Code");
        this.$page = $page;

        // Plugin Introduction and Usage
        this.$body = tag('div', {
            className: 'wc-intro',
            innerHTML: `
            <h1>Plugin Usage</h1>
            <p>Supports <b>C (cJSON), C#, C++, Crystal, Dart, Elm, Flow, Go, Haskell, JSON Schema, Java, JavaScript, JavaScript PropTypes, Kotlin, Objective-C, PHP, Pike, Python, Ruby, Rust, Scala3, Smithy, Swift, TypeScript, TypeScript Effect Schema</b> and <b>TypeScript Zod</b></p>
            <img src="${this.baseUrl}assets/screen-record.gif" alt="Screen Recording" width="200" height="400" />
            <p>In any JSON file, use the command &quot;<em>Open Quicktype for JSON</em>&quot; or &quot;<em>Open Quicktype for JSON Schema</em>&quot; in command palette (<i>Ctrl + Shift + p</i>), which will generate types from the JSON.</p>
            <h2>Credits</h2>
            <p>Type generation within this plugin is powered by <a href="https://github.com/glideapps/quicktype">quicktype-core</a>, enabling rapid and reliable creation of type interfaces and definitions.</p>
            `
        });

        this.$style = tag('style', {
            innerText: `
                .wc-intro {
                    padding: 1rem 1.5rem;
                    line-height: 1.5
                }
                
                img {
                    width: 100%;
                    height: auto;
                    margin: 1.5rem 0 1.25rem
                }

                em {
                    background: #ccc;
                    color: #222;
                    padding: 0.15rem 0.25rem;
                    border-radius: 0.15rem;
                }
                
                p {
                    margin-top: 1rem
                }

                h2 {
                    margin-top: 2rem
                }
            `
        });

        this.$page.append(this.$style, this.$body);

        if (!localStorage.getItem('j2claunch')) {
            this.$page.show();
            localStorage.setItem('j2claunch', 'true');
        }

        editorManager.editor.commands.addCommand({
            name: 'Open Quicktype for JSON',
            exec: async () => {
                await this.quickTypeGenerate('json');
            }
        })

        editorManager.editor.commands.addCommand({
            name: 'Open Quicktype for JSON Schema',
            exec: async () => {
                await this.quickTypeGenerate('schema');
            }
        })
    }

    async destroy() {
        editorManager.editor.commands.removeCommand({
            name: 'Open Quicktype for JSON',
            exec: async () => {
                await this.quickTypeGenerate('json');
            }
        })

        editorManager.editor.commands.removeCommand({
            name: 'Open Quicktype for JSON Schema',
            exec: async () => {
                await this.quickTypeGenerate('schema');
            }
        })

        this.$body?.remove();
        this.$style?.remove();

        localStorage.removeItem('j2claunch')

    }
}

if (window.acode) {
    const acodePlugin = new AcodePlugin();
    acode.setPluginInit(plugin.id, async (baseUrl: string, $page: WCPage, { cacheFileUrl, cacheFile }: any) => {
        if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
        }
        acodePlugin.baseUrl = baseUrl;
        await acodePlugin.init($page, cacheFile, cacheFileUrl);
    });
    acode.setPluginUnmount(plugin.id, () => {
        acodePlugin.destroy();
    });
}
