#!/usr/bin/env php
<?php

use MLocati\PhpCsFixerConfigurator\DataExtractor;

require_once dirname(__DIR__) . '/vendor/autoload.php';

echo 'Extracting data... ';
$dataExtractor = new DataExtractor();
$data = [
    'version' => $dataExtractor->getVersion(),
    'indent' => $dataExtractor->getDefaultIndent(),
    'lineEnding' => $dataExtractor->getDefaultLineEnding(),
    'fixers' => $dataExtractor->getFixers(),
    'sets' => $dataExtractor->getSets(),
];
echo "done.\n";

echo 'Saving data... ';
if (@file_put_contents(dirname(__DIR__) . '/docs/js/php-cs-fixer-data.json', json_encode($data, JSON_PRETTY_PRINT)) === false) {
    echo "ERROR!\n";
    exit(1);
}
if (@file_put_contents(dirname(__DIR__) . '/docs/js/php-cs-fixer-data.min.json', json_encode($data)) === false) {
    echo "ERROR!\n";
    exit(1);
}
echo "done.\n";
