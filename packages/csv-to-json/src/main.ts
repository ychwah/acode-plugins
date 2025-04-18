import plugin from '../plugin.json';
import CSVJSON  from './csv2json.js';

const alert = acode.require('alert');

class AcodePlugin {
    public baseUrl: string | undefined;

    csvToJson() {
        const { filename } = editorManager.activeFile;
        if (filename && filename.endsWith('.csv')) {
            const activeFileContent = editorManager.editor.session.getValue();
            const jsonFile = CSVJSON(activeFileContent, {parseNumbers: true});
            const jsonFileName = filename.split('.')[0] || 'File';

            acode.newEditorFile(`${jsonFileName}.json`, {
                text: JSON.stringify(jsonFile),
                isUnsaved: true,
                render: true
            });
        } else {
            alert('Invalid CSV file', 'Input must be Comma Separated Value(.csv) file.');
        }
    }

    async init($page: WCPage, cacheFile: any, cacheFileUrl: string): Promise<void> {
        editorManager.editor.commands.addCommand({
            name: 'CSV to JSON',
            exec: async () => {
                try {
                    this.csvToJson();
                }catch(e) {
                    alert('Conversation to JSON failed', 'The CSV file could not be converted to JSON.');
                    console.log(e)
                }
            }
        })
    }

    async destroy() {
        // Add your cleanup code here
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
