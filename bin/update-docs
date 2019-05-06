#!/usr/bin/env php
<?php

use MLocati\PhpCsFixerConfigurator\DataExtractor;

if (PHP_VERSION_ID < 70100) {
    fprintf(STDERR, "This script must be run with PHP 7.1+.\n");
    exit(1);
}

function deleteFromFilesystem($path)
{
    if (is_link($path) || is_file($path)) {
        @unlink($path);
    }
    elseif (is_dir($path)) {
        $hDir = @opendir($path);
        while(($item = @readdir($hDir)) !== false) {
            switch ($item) {
                case '.':
                case '..':
                    break;
                default:
                    deleteFromFilesystem($path . '/' . $item);
                    break;
            }
        }
        @closedir($hDir);
        @rmdir($path);
    }
}

if (isset($argv[1])) {
    @unlink(dirname(__DIR__) . '/composer.lock');
    deleteFromFilesystem(dirname(__DIR__) . '/vendor');
    fprintf(STDOUT, "Installing PHP-CS-Fixer version {$argv[1]}... ");
    $cmd = ['composer'];
    $cmd[] = '--no-progress';
    $cmd[] = '--no-suggest';
    $cmd[] = '--optimize-autoloader';
    $cmd[] = '--quiet';
    $cmd[] = '--no-ansi';
    $cmd[] = '--no-interaction';
    $cmd[] = '--working-dir=' . escapeshellarg(dirname(__DIR__));
    $cmd[] = 'require';
    $cmd[] = escapeshellarg("friendsofphp/php-cs-fixer:{$argv[1]}");
    $cmd[] = '2>&1';
    $output = [];
    $rc = -1;
    @exec(implode(' ', $cmd), $output, $rc);
    if ($rc !== 0) {
        fprintf(STDERR, 'composer failed: ' . trim(implode("\n", $output)) . "\n");
        exit($rc);
    }
    fprintf(STDOUT, "done.\n");
}

require_once dirname(__DIR__) . '/vendor/autoload.php';

fprintf(STDOUT, 'Extracting data... ');
$dataExtractor = new DataExtractor();
$version = $dataExtractor->getVersion();
$data = [
    'version' => $version,
    'indent' => $dataExtractor->getDefaultIndent(),
    'lineEnding' => $dataExtractor->getDefaultLineEnding(),
    'fixers' => $dataExtractor->getFixers(),
    'sets' => $dataExtractor->getSets(),
];
fprintf(STDOUT, "done.\n");

$jsDir = dirname(__DIR__) . '/docs/js';

fprintf(STDOUT, 'Saving data... ');
if (is_file("{$jsDir}/php-cs-fixer-versions.json")) {
    $versions = @json_decode(@file_get_contents("{$jsDir}/php-cs-fixer-versions.json"));
    if (!is_array($versions)) {
        fprintf(STDERR, "Error loading versions file!\n");
    }
} else {
    $versions = [];
}
if (!in_array($version, $versions, true)) {
    $versions[] = $version;
    usort($versions, function ($versionA, $versionB) {
        return version_compare($versionB, $versionA);
    });
    if (@file_put_contents("{$jsDir}/php-cs-fixer-versions.json", json_encode($versions, JSON_PRETTY_PRINT)) === false) {
        fprintf(STDERR, "Error saving versions file!\n");
        exit(1);
    }
}
if (@file_put_contents("{$jsDir}/php-cs-fixer-data-{$version}.json", json_encode($data, JSON_PRETTY_PRINT)) === false) {
    fprintf(STDERR, "Error saving data!\n");
    exit(1);
}
if (@file_put_contents("{$jsDir}/php-cs-fixer-data-{$version}.min.json", json_encode($data)) === false) {
    fprintf(STDERR, "Error saving compressed data!\n");
    exit(1);
}
fprintf(STDOUT, "done.\n");
