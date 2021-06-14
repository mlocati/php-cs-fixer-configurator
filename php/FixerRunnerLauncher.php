<?php

namespace MLocati\PhpCsFixerConfigurator;

use RuntimeException;

class FixerRunnerLauncher
{
    private $phpBinaries = [];

    public function run($phpVersion, $fixer)
    {
        $cmd = escapeshellarg($this->getPHPBinary($phpVersion));
        $cmd .= ' ' . escapeshellarg(__DIR__ . '/assets/fixer-runner');
        $cmd .= ' ' . escapeshellarg($fixer->getName());
        $rc = -1;
        $output = [];
        exec("{$cmd} 2>&1", $output, $rc);
        if ($rc !== 0) {
            throw new RuntimeException("Invokation of fixer-runner failed:\n" . implode("\n", $output));
        }
        $decoded = base64_decode(trim(implode("\n", $output)), true);
        if ($decoded === false) {
            throw new RuntimeException("Failed to decode output of fixer-runner:\n" . implode("\n", $output));
        }
        $array = unserialize($decoded);
        if (!is_array($array)) {
            throw new RuntimeException("Failed to unserialize output of fixer-runner:\n{$decoded}");
        }

        return $array;
    }
    /**
     * @param string $version
     *
     * @throws \RuntimeException
     *
     * @return string
     */
    private function getPHPBinary($version)
    {
        if (isset($this->phpBinaries[$version])) {
            return $this->phpBinaries[$version];
        }
        if ($version === PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION) {
            $binary = PHP_BINARY;
        } else {
            if (getenv('PHPCSFIXERCONFIGURATOR_DOCKER') === 'y') {
                $binary = "/usr/bin/php{$version}";
            } else {
                $binary = getenv("PHP{$version}");
                if ($binary === false) {
                    throw new RuntimeException("The script requires that you have PHP {$version} installed, and that you have a PHP{$version} environment variable containing its full path");
                }
                if ($binary === '') {
                    throw new RuntimeException("The PHP{$version} environment variable is empty");
                }
            }
            if (!is_file($binary)) {
                throw new RuntimeException("The PHP binary for version {$version} could not be found in the path {$binary}");
            }
        }
        $this->phpBinaries[$version] = $binary;

        return $this->phpBinaries[$version];
    }
}
