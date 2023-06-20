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
        $patches = [];
        $this->fixNoSuperfluousElseifFixerRegex($vendorDir, $patches);
        $this->fixPhpUnitNoExpectationAnnotationFixerImplode($vendorDir, $patches);
        $this->addReturnTypeWillChange($vendorDir, $patches);

        return $patches;
    }

    private function fixNoSuperfluousElseifFixerRegex($vendorDir, array &$patches)
    {
        $file = "{$vendorDir}/friendsofphp/php-cs-fixer/src/Fixer/ControlStructure/NoSuperfluousElseifFixer.php";
        if (!is_file($file)) {
            return;
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
        $patches[] = [$file, $contents];
    }

    private function fixPhpUnitNoExpectationAnnotationFixerImplode($vendorDir, array &$patches)
    {
        $file = "{$vendorDir}/friendsofphp/php-cs-fixer/src/Fixer/PhpUnit/PhpUnitNoExpectationAnnotationFixer.php";
        if (!is_file($file)) {
            return;
        }
        $contents = file_get_contents($file);
        if (strpos($contents, '.implode($paramList, \', \')') === false) {
            return;
        }
        file_put_contents($file, str_replace('.implode($paramList, \', \')', '.implode(\', \', $paramList)', $contents));

        $patches[] = [$file, $contents];
    }

    private function addReturnTypeWillChange($vendorDir, array &$patches)
    {
        foreach ([
            "{$vendorDir}/symfony/finder/Symfony/Component/Finder/Finder.php",
            "{$vendorDir}/symfony/finder/Symfony/Component/Finder/Iterator/FilterIterator.php",
            "{$vendorDir}/symfony/finder/Symfony/Component/Finder/Iterator/FileTypeFilterIterator.php",
            "{$vendorDir}/symfony/finder/Symfony/Component/Finder/Iterator/RecursiveDirectoryIterator.php",
            "{$vendorDir}/symfony/finder/Symfony/Component/Finder/Iterator/ExcludeDirectoryFilterIterator.php",
            "{$vendorDir}/symfony/finder/Symfony/Component/Finder/Iterator/PathFilterIterator.php",
            "{$vendorDir}/symfony/options-resolver/Symfony/Component/OptionsResolver/OptionsResolver.php",
            "{$vendorDir}/symfony/finder/Finder.php",
            "{$vendorDir}/symfony/finder/Iterator/FilterIterator.php",
            "{$vendorDir}/symfony/finder/Iterator/FileTypeFilterIterator.php",
            "{$vendorDir}/symfony/finder/Iterator/RecursiveDirectoryIterator.php",
            "{$vendorDir}/symfony/finder/Iterator/ExcludeDirectoryFilterIterator.php",
            "{$vendorDir}/symfony/finder/Iterator/PathFilterIterator.php",
            "{$vendorDir}/symfony/options-resolver/OptionsResolver.php",
            "{$vendorDir}/friendsofphp/php-cs-fixer/src/StdinFileInfo.php",
            "{$vendorDir}/friendsofphp/php-cs-fixer/src/Doctrine/Annotation/Tokens.php",
        ] as $file) {
            if (!is_file($file)) {
                continue;
            }
            $originalContents = file_get_contents($file);
            if (strpos($originalContents, '#[\ReturnTypeWillChange]') !== false) {
                continue;
            }
            $contents = str_replace("\r", "\n", str_replace("\r\n", "\n", $originalContents));
            $patched = false;
            foreach ([
                '__toString',
                'accept',
                'count',
                'current',
                'getATime',
                'getBasename',
                'getChildren',
                'getCTime',
                'getExtension',
                'getFileInfo',
                'getFilename',
                'getGroup',
                'getInode',
                'getIterator',
                'getLinkTarget',
                'getMTime',
                'getOwner',
                'getPath',
                'getPathInfo',
                'getPathname',
                'getPerms',
                'getRealPath',
                'getSize',
                'getType',
                'hasChildren',
                'isDir',
                'isExecutable',
                'isFile',
                'isLink',
                'isReadable',
                'isWritable',
                'offsetExists',
                'offsetGet',
                'offsetSet',
                'offsetUnset',
                'openFile',
                'rewind',
                'setFileClass',
                'setInfoClass',
            ] as $function) {
                if (!preg_match('/\spublic function ' . $function . '\([^)]*\)\n/', $contents)) {
                    continue;
                }
                $patched = true;
                $contents = str_replace("public function {$function}(", "#[\ReturnTypeWillChange]\npublic function {$function}(", $contents);
            }
            if (!$patched) {
                continue;
            }
            file_put_contents($file, $contents);
            $patches[] = [$file, $originalContents];
        }
    }
}
