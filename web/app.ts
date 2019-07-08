import App from './components/App.vue';
import BootstrapVue from 'bootstrap-vue'
import * as  LocationHash from './LocationHash';
import * as PersistentStorage from './PersistentStorage';
import Version from './Version';
import Vue from 'vue';
import { SerializedConfigurationInterface } from './Configuration';
import { WSAENAMETOOLONG } from 'constants';

Vue.use(BootstrapVue);

Version.getVersions().then((versions: Version[]) => {
    if (versions.length === 0) {
        throw new Error('No versions found');
    }
    const initialSerializedConfiguration: SerializedConfigurationInterface | undefined = PersistentStorage.getObject('configuration');
    let wantedVersion: Version | null = null;
    let hash = LocationHash.fromWindowLocation();
    if (wantedVersion === null && hash.majorMinorVersion.length !== 0) {
        versions.some((v: Version) => {
            if (v.mayorMinorVersion !== hash.majorMinorVersion) {
                return false;
            }
            wantedVersion = v;
            return true;
        });
        if (wantedVersion === null) {
            console.warn(`Failed to find the version ${hash.majorMinorVersion} specified in the URL.`);
        }
    }
    if (wantedVersion === null && initialSerializedConfiguration && initialSerializedConfiguration.version) {
        versions.some((v: Version) => {
            if (initialSerializedConfiguration.version !== v.mayorMinorVersion && (<string>initialSerializedConfiguration.version).indexOf(v.mayorMinorVersion + '.') !== 0) {
                return false;
            }
            wantedVersion = v;
            return true;
        });
        if (wantedVersion === null) {
            console.warn(`Failed to find the version ${hash.majorMinorVersion} specified in the previously saved configuration.`);
        }
    }
    let version: Version = wantedVersion || versions[0];
    version.load()
        .then(() => {
            document.body.removeChild(<HTMLElement>document.getElementById('loading'));
            new Vue({
                components: {
                    App
                },
                el: 'app',
                data: {
                    versions: versions,
                    initialVersion: version,
                    initialLocationHash: hash,
                    initialSerializedConfiguration: initialSerializedConfiguration,
                }
            });
        })
        .catch((error) => {
            window.alert(error);
        })
        ;
});
