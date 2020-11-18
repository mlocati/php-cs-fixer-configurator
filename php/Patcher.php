<?php
namespace MLocati\PhpCsFixerConfigurator;

class Patcher
{
    private $filesToRevert;

    private function __construct()
    {
        $this->filesToRevert = $this->collectPatches(dirname(__DIR__) . '/vendor');
    }

    private function revert()
    {
        while ($this->filesToRevert !== []) {
            $revert = array_pop($this->filesToRevert);
            file_put_contents($revert[0], $revert[1]);
        }
    }

    public function __destruct()
    {
        $this->revert();
    }

    public static function withPatches(callable $callback)
    {
        $patcher = new self();
        try {
            $callback();
        } finally {
            $patcher->revert();
        }
    }

    private function collectPatches($vendorDir)
    {
        return array_merge(
            $this->fixNoSuperfluousElseifFixerRegex($vendorDir),
            $this->PhpUnitNoExpectationAnnotationFixerImplode($vendorDir),
        );
    }

    private function fixNoSuperfluousElseifFixerRegex($vendorDir)
    {
        $file = "{$vendorDir}/friendsofphp/php-cs-fixer/src/Fixer/ControlStructure/NoSuperfluousElseifFixer.php";
        if (!is_file($file)) {
            return [];
        }
        $contents = file_get_contents($file);
        $lines = explode("\n", $contents);
        if (isset($lines[85]) && $lines[85] === <<<'EOT'
            if ($token->isWhitespace() && preg_match('/(\R[^\R]*)$/', $token->getContent(), $matches)) {
EOT
        ) {
            $lines[85] = <<<'EOT'
            if ($token->isWhitespace() && preg_match('/(\R\N*)$/', $token->getContent(), $matches)) {
EOT
            ;
        } elseif (isset($lines[86]) && $lines[86] === <<<'EOT'
            if ($token->isWhitespace() && Preg::match('/(\R[^\R]*)$/', $token->getContent(), $matches)) {
EOT
        ) {
            $lines[86] = <<<'EOT'
            if ($token->isWhitespace() && Preg::match('/(\R\N*)$/', $token->getContent(), $matches)) {
EOT
            ;
        } else {
            return [];
        }
        file_put_contents($file, implode("\n", $lines));

        return [[$file, $contents]];
    }

    private function PhpUnitNoExpectationAnnotationFixerImplode($vendorDir)
    {
        $file = "{$vendorDir}/friendsofphp/php-cs-fixer/src/Fixer/PhpUnit/PhpUnitNoExpectationAnnotationFixer.php";
        if (!is_file($file)) {
            return [];
        }
        $contents = file_get_contents($file);
        if (strpos($contents, '.implode($paramList, \', \')') === false) {
            return [];
        }
        file_put_contents($file, str_replace('.implode($paramList, \', \')', '.implode(\', \', $paramList)', $contents));

        return [[$file, $contents]];
    }
}