#!/usr/bin/env php
<?php

use MLocati\PhpCsFixerConfigurator\DataExtractor;

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
