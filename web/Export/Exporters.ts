import ExporterInterface from "./ExporterInterface";
import JsonExporter from "./JsonExporter";
import PhpCsExporter from "./PhpCsExporter";
import PhpECSExporter from "./PhpECSExporter";
import StyleCIExporter from "./StyleCIExporter";
import YamlExporter from "./YamlExporter";

const Exporters: ExporterInterface[] = [
    new PhpCsExporter(),
    new PhpECSExporter(),
    new JsonExporter(),
    new YamlExporter(),
    new StyleCIExporter(),
];

export default Exporters;
