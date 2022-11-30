import AutoDetectImporter from "./AutoDetectImporter";
import ImporterInterface from "./ImporterInterface";
import JsonImporter from "./JsonImporter";
import PhpImporter from "./PhpImporter";
import PhpECSImporter from "./PhpECSImporter";
import YamlImporter from "./YamlImporter";

const ActualImporters = [
    new PhpImporter(),
    new PhpECSImporter(),
    new JsonImporter(),
    new YamlImporter(),
];

const Importers: ImporterInterface[] = (<ImporterInterface[]>[new AutoDetectImporter(ActualImporters)]).concat(<ImporterInterface[]>ActualImporters);

export default Importers;
