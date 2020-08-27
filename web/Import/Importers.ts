import AutoDetectImporter from "./AutoDetectImporter";
import ImporterInterface from "./ImporterInterface";
import JsonImporter from "./JsonImporter";
import PhpImporter from "./PhpImporter";
import PHPECSImporter from "./PHPECSImporter";
import YamlImporter from "./YamlImporter";
import PhpECSExporter from "../Export/PhpECSExporter";

const ActualImporters = [
    new PhpImporter(),
    new PHPECSImporter(),
    new JsonImporter(),
    new YamlImporter(),
];

const Importers: ImporterInterface[] = (<ImporterInterface[]>[new AutoDetectImporter(ActualImporters)]).concat(<ImporterInterface[]>ActualImporters);

export default Importers;
