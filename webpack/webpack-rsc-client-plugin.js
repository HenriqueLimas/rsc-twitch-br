import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export class WebpackRscClientPlugin {
  clientReferencesMap;
  clientChunkNameMap = new Map();
  clientManifest = {};
  clientManifestFilename;
  ssrManifest = {
    moduleMap: {},
    moduleLoading: null,
    entryCssFiles: {},
  };
  ssrManifestFilename;
  constructor(options) {
    this.clientReferencesMap = options.clientReferencesMap;
    this.clientManifestFilename =
      options.clientManifestFilename || `react-client-manifest.json`;
    this.ssrManifestFilename =
      options?.ssrManifestFilename || `react-ssr-manifest.json`;
  }
  apply(compiler) {
    const {
      AsyncDependenciesBlock,
      RuntimeGlobals,
      dependencies: { ModuleDependency, NullDependency },
      sources: { RawSource },
    } = compiler.webpack;
    class ClientReferenceDependency extends ModuleDependency {
      constructor(request) {
        super(request);
      }
      get type() {
        return `client-reference`;
      }
    }
    compiler.hooks.thisCompilation.tap(
      WebpackRscClientPlugin.name,
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          ClientReferenceDependency,
          normalModuleFactory
        );
        compilation.dependencyTemplates.set(
          ClientReferenceDependency,
          new NullDependency.Template()
        );
        const reactServerDomClientPath = require.resolve(
          `react-server-dom-webpack/client.browser`
        );
        const onNormalModuleFactoryParser = (parser) => {
          compilation.assetsInfo;
          parser.hooks.program.tap(WebpackRscClientPlugin.name, () => {
            if (parser.state.module.resource === reactServerDomClientPath) {
              [...this.clientReferencesMap.keys()].forEach(
                (resourcePath, index) => {
                  const chunkName = `client${index}`;
                  this.clientChunkNameMap.set(chunkName, resourcePath);
                  const block = new AsyncDependenciesBlock(
                    { name: chunkName },
                    undefined,
                    resourcePath
                  );
                  block.addDependency(
                    new ClientReferenceDependency(resourcePath)
                  );
                  parser.state.module.addBlock(block);
                }
              );
            }
          });
        };
        normalModuleFactory.hooks.parser
          .for(`javascript/auto`)
          .tap(`HarmonyModulesPlugin`, onNormalModuleFactoryParser);
        normalModuleFactory.hooks.parser
          .for(`javascript/dynamic`)
          .tap(`HarmonyModulesPlugin`, onNormalModuleFactoryParser);
        normalModuleFactory.hooks.parser
          .for(`javascript/esm`)
          .tap(`HarmonyModulesPlugin`, onNormalModuleFactoryParser);
        compilation.hooks.additionalTreeRuntimeRequirements.tap(
          WebpackRscClientPlugin.name,
          (_chunk, runtimeRequirements) => {
            runtimeRequirements.add(RuntimeGlobals.ensureChunk);
            runtimeRequirements.add(RuntimeGlobals.compatGetDefaultExport);
          }
        );
        compilation.hooks.chunkAsset.tap(
          WebpackRscClientPlugin.name,
          (chunk, filename) => {
            const resourcePath = this.clientChunkNameMap.get(chunk.name);
            if (resourcePath) {
              const clientReferences =
                this.clientReferencesMap.get(resourcePath);
              if (clientReferences) {
                const module = compilation.chunkGraph
                  .getChunkModules(chunk)
                  .find(
                    (chunkModule) =>
                      chunkModule.nameForCondition() === resourcePath
                  );
                if (module) {
                  const stats = compilation.getStats().toJson({
                    all: false,
                    assets: true,
                    ids: true,
                    cachedAssets: true,
                    cachedModules: true,
                  });
                  const moduleId = compilation.chunkGraph.getModuleId(module);
                  const ssrModuleMetaData = {};
                  for (const { id, exportName, ssrId } of clientReferences) {
                    // Theoretically the used client and SSR export names should
                    // be used here. These might differ from the original export
                    // names that the loader has recorded. But with the current
                    // setup (i.e. how the client entries are added on both
                    // sides), the original export names are preserved.
                    const clientExportName = exportName;
                    const ssrExportName = exportName;
                    const chunks = [];

                    for (const chunkId of chunk.ids) {
                      chunks.push(chunkId);
                      chunks.push(filename);

                      const fileId = filename.split('.')[0];
                      const hasCss = stats.assetsByChunkName[fileId].some(
                        (cssChunk) => cssChunk.endsWith('.css')
                      );
                      this.ssrManifest.entryCssFiles[fileId] = hasCss
                        ? `${fileId}.css`
                        : null;
                    }
                    this.clientManifest[id] = {
                      id: moduleId,
                      name: clientExportName,
                      chunks,
                    };
                    if (ssrId) {
                      ssrModuleMetaData[clientExportName] = {
                        id: ssrId,
                        name: ssrExportName,
                        chunks: [],
                      };
                    }
                  }
                  this.ssrManifest.moduleMap[moduleId] = ssrModuleMetaData;
                }
              }
            }
          }
        );
        compilation.hooks.processAssets.tap(WebpackRscClientPlugin.name, () => {
          compilation.emitAsset(
            this.clientManifestFilename,
            new RawSource(JSON.stringify(this.clientManifest, null, 2), false)
          );
          compilation.emitAsset(
            this.ssrManifestFilename,
            new RawSource(JSON.stringify(this.ssrManifest, null, 2), false)
          );
        });
      }
    );
  }
}
