<?php
namespace MLocati\PhpCsFixerConfigurator;

use MLocati\PhpCsFixerConfigurator\ExtractedData\EmptyArrayValue;
use PhpCsFixer\Config;
use PhpCsFixer\Console\Application;
use PhpCsFixer\Fixer;
use PhpCsFixer\FixerConfiguration;
use PhpCsFixer\FixerDefinition;
use PhpCsFixer\FixerFactory;
use PhpCsFixer\RuleSet;
use PhpCsFixer\StdinFileInfo;
use PhpCsFixer\Tokenizer\Tokens;

class DataExtractor
{
    /**
     * @var \MLocati\PhpCsFixerConfigurator\FixerRunnerLauncher
     */
    private $fixerRunnerLauncher;

    public function __construct()
    {
        $this->fixerRunnerLauncher = new FixerRunnerLauncher();
    }

    /**
     * Get the PHP-CS-Fixer version.
     *
     * @return string
     */
    public function getVersion()
    {
        switch (Application::VERSION) {
            case '2.18.4-DEV';
                return '2.18.4';
            default:
                return Application::VERSION;
        }
    }

    /**
     * Get the default indent.
     *
     * @return string
     */
    public function getDefaultIndent()
    {
        return (new Config())->getIndent();
    }

    /**
     * Get the default line ending.
     *
     * @return string
     */
    public function getDefaultLineEnding()
    {
        return (new Config())->getLineEnding();
    }

    /**
     * @return array
     */
    public function getFixers()
    {
        $result = [];
        if (method_exists(FixerFactory::class, 'create')) {
            $factory = FixerFactory::create();
        } else {
            $factory = new FixerFactory();
        }
        set_error_handler(static function () {}, E_DEPRECATED);
        $factory->registerBuiltInFixers();
        restore_error_handler();
        foreach ($factory->getFixers() as $fixer) {
            $fixerData = [];
            if ($fixer->isRisky()) {
                $fixerData['risky'] = true;
            }
            if ($fixer instanceof Fixer\ConfigurationDefinitionFixerInterface || $fixer instanceof Fixer\ConfigurableFixerInterface) {
                foreach ($fixer->getConfigurationDefinition()->getOptions() as $option) {
                    $o = [
                        'name' => $option->getName(),
                    ];
                    if ($option instanceof FixerConfiguration\AliasedFixerOption) {
                        $s = (string) $option->getAlias();
                        if ($s !== '') {
                            $o['alias'] = $s;
                        }
                    }
                    $s = (string) $option->getDescription();
                    if ($s !== '') {
                        $o['description'] = str_replace(PHP_EOL, "\n", $s);
                    }
                    if ($option->hasDefault()) {
                        $defaultOptionValue = $option->getDefault();
                        if ($defaultOptionValue === []) {
                            $defaultOptionValue = $this->guessOptionEmptyArrayType($option, $fixer);
                        }
                        $o['defaultValue'] = $defaultOptionValue;
                    }
                    $allowedTypes = $option->getAllowedTypes();
                    if ($allowedTypes !== null) {
                        $o['allowedTypes'] = $allowedTypes;
                    }
                    $allowedValues = $option->getAllowedValues();
                    if ($allowedValues !== null) {
                        $nullIndex = array_search(null, $allowedValues, true);
                        if ($nullIndex !== false) {
                            array_splice($allowedValues, $nullIndex, 1);
                        }
                        if (count($allowedValues) === 1 && $allowedValues[0] instanceof FixerConfiguration\AllowedValueSubset) {
                            $sublist = $allowedValues[0]->getAllowedValues();
                            $group = [];
                            foreach ($sublist as $allowedValue) {
                                if (!is_scalar($allowedValue)) {
                                    $group = null;
                                    break;
                                }
                                $group[] = $allowedValue;
                            }
                            if ($group === null || $group === []) {
                                $allowedValues = null;
                            } else {
                                $allowedValues = [$group];
                            }
                        } else {
                            foreach ($allowedValues as $allowedValue) {
                                if (!is_scalar($allowedValue)) {
                                    $allowedValues = null;
                                    break;
                                }
                            }
                        }
                        if ($allowedValues !== null) {
                            if ($nullIndex !== false) {
                                $allowedValues[] = null;
                            }
                            $o['allowedValues'] = $allowedValues;
                        }
                    }
                    if (!isset($fixerData['configuration'])) {
                        $fixerData['configuration'] = [];
                    }
                    $fixerData['configuration'][] = $o;
                }
                usort($fixerData['configuration'], function (array $option1, array $option2) {
                    return strcasecmp($option1['name'], $option2['name']);
                });
            }
            if (!interface_exists(Fixer\DefinedFixerInterface::class) || $fixer instanceof Fixer\DefinedFixerInterface) {
                $definition = $fixer->getDefinition();
                $s = (string) $definition->getSummary();
                if ($s !== '') {
                    $fixerData['summary'] = str_replace(PHP_EOL, "\n", $s);
                }
                $s = (string) $definition->getDescription();
                if ($s !== '') {
                    $fixerData['description'] = str_replace(PHP_EOL, "\n", $s);
                }
                $s = (string) $definition->getRiskyDescription();
                if ($s !== '') {
                    $fixerData['riskyDescription'] = str_replace(PHP_EOL, "\n", $s);
                }
                $requiredPHPVersion = $this->getOverrideRequiredPHPVersion($fixer->getName());
                if ($requiredPHPVersion) {
                    $fixerData += $this->fixerRunnerLauncher->run($requiredPHPVersion, $fixer);
                } else {
                    $fixerData += $this->getFixerSamples($fixer);
                }
            }
            if ($fixer instanceof Fixer\DeprecatedFixerInterface) {
                $fixerData['deprecated_switchTo'] = $fixer->getSuccessorsNames();
            }
            $fixerData['fullClassName'] = get_class($fixer);
            $result[$fixer->getName()] = $fixerData;
        }
        ksort($result, SORT_FLAG_CASE);

        return $result;
    }

    /**
     * @return array
     */
    public function getSets()
    {
        $result = [];
        $setNames = $this->getSetNames();
        foreach ($setNames as $setName) {
            $ruleSet = $this->createRuleSet([$setName => true]);
            $config = [];
            foreach ($ruleSet->getRules() as $ruleName => $ruleConfiguration) {
                $config[$ruleName] = $ruleConfiguration === true ? null : $ruleConfiguration;
                if (is_array($config[$ruleName])) {
                    ksort($config[$ruleName], SORT_NATURAL);
                }
            }
            ksort($config, SORT_NATURAL);
            $result[$setName] = $config;
        }
        ksort($result, SORT_NATURAL);

        return $result;
    }

    public function getFixerSamples($fixer)
    {
        $result = [];
        $shouldNormalizeSamplesEOL = $this->shouldNormalizeSamplesEOL($fixer);
        $definition = $fixer->getDefinition();
        foreach ($definition->getCodeSamples() as $codeSample) {
            $old = $codeSample->getCode();
            $originalConfiguration = $codeSample->getConfiguration();
            $tokens = $this->extractTokens($old);
            if ($fixer instanceof Fixer\ConfigurableFixerInterface) {
                $fixer->configure($originalConfiguration === null ? [] : $originalConfiguration);
            }
            $file = $codeSample instanceof FixerDefinition\FileSpecificCodeSampleInterface ? $codeSample->getSplFileInfo() : new StdinFileInfo();
            $fixer->fix($file, $tokens);
            $new = $tokens->generateCode();
            if (!isset($result['codeSamples'])) {
                $result['codeSamples'] = [];
            }
            if ($fixer instanceof Fixer\Basic\Psr0Fixer || $fixer instanceof Fixer\Basic\PsrAutoloadingFixer) {
                $new = $this->anonymizePSR0Code($new);
            }
            if ($shouldNormalizeSamplesEOL) {
                $old = str_replace(PHP_EOL, "\n", $old);
                $new = str_replace(PHP_EOL, "\n", $new);
            }
            $codeSampleData = [
                'from' => $old,
                'to' => $new,
            ];
            if ($originalConfiguration !== null) {
                $codeSampleData['configuration'] = $this->anonymizePaths($originalConfiguration);
            }
            $result['codeSamples'][] = $codeSampleData;
        }

        return $result;
    }

    /**
     * @return bool
     */
    private function shouldNormalizeSamplesEOL($fixer)
    {
        switch ($fixer->getName()) {
            // Samples contain PHP_EOL instead of regular end of lines until version 2.14
            case 'native_constant_invocation':
                return true;
            default:
                return false;
        }
    }

    /**
     * @param string $value
     *
     * @return $string
     */
    private function anonymizePSR0Code($value)
    {
        $baseActualPath = trim(str_replace(DIRECTORY_SEPARATOR, '/', dirname(__DIR__)), '/');
        $fakePath = trim('/path/to');
        foreach (['/vendor/friendsofphp/php-cs-fixer/src', '/vendor/friendsofphp/php-cs-fixer', ''] as $suffix) {
            $search = strtr($baseActualPath . $suffix, '/', '_');
            $replace = strtr(trim($fakePath, '/'), '/', '_');
            $value = str_replace($search, $replace, $value);
        }

        return $value;
    }

    /**
     * @param mixed $value
     *
     * @return mixed
     */
    private function anonymizePaths($value)
    {
        if (is_array($value)) {
            $result = [];
            foreach ($value as $key => $item) {
                $result[$key] = $this->anonymizePaths($item);
            }
        } else {
            $result = $value;
            if (is_string($value)) {
                $valueNormalized = str_replace(DIRECTORY_SEPARATOR, '/', $value);
                $rootNormalized = rtrim(str_replace(DIRECTORY_SEPARATOR, '/', dirname(__DIR__)), '/') . '/';
                if (strpos($valueNormalized, $rootNormalized) === 0) {
                    $result = '/path/to/' . substr($valueNormalized, strlen($rootNormalized));
                }
            }
        }

        return $result;
    }

    /**
     * @param \PhpCsFixer\Fixer\ConfigurationDefinitionFixerInterface|\PhpCsFixer\Fixer\ConfigurableFixerInterface $fixer
     *
     * @return \MLocati\PhpCsFixerConfigurator\ExtractedData\EmptyArrayValue
     */
    private function guessOptionEmptyArrayType(FixerConfiguration\FixerOptionInterface $option, $fixer)
    {
        $result = new EmptyArrayValue();

        if (!interface_exists(Fixer\DefinedFixerInterface::class) || $fixer instanceof Fixer\DefinedFixerInterface) {
            foreach ($fixer->getDefinition()->getCodeSamples() as $codeSample) {
                $sampleConfiguration = $codeSample->getConfiguration();
                if (is_array($sampleConfiguration) && isset($sampleConfiguration[$option->getName()])) {
                    $sampleOptionConfiguration = $sampleConfiguration[$option->getName()];
                    if (is_array($sampleOptionConfiguration)) {
                        $count = count($sampleOptionConfiguration);
                        if ($count !== 0) {
                            if (array_keys($sampleOptionConfiguration) === range(0, $count - 1)) {
                                $result->setJsonKind(EmptyArrayValue::JSONKIND_ARRAY);
                            } else {
                                $result->setJsonKind(EmptyArrayValue::JSONKIND_OBJECT);
                            }
                            break;
                        }
                    }
                }
            }
        }

        return $result;
    }

    /**
     * @param string $code
     *
     * @return \PhpCsFixer\Tokenizer\Tokens
     */
    private function extractTokens($code)
    {
        set_error_handler(function () {}, E_WARNING | E_NOTICE | E_CORE_WARNING | E_COMPILE_WARNING | E_USER_WARNING | E_USER_NOTICE | E_STRICT | E_RECOVERABLE_ERROR | E_DEPRECATED | E_USER_DEPRECATED);
        $tokens = Tokens::fromCode($code);
        restore_error_handler();

        return $tokens;
    }

    /**
     * @return string[]
     */
    private function getSetNames()
    {
        if (class_exists(RuleSet\RuleSets::class) && method_exists(RuleSet\RuleSets::class, 'getSetDefinitionNames')) {
            return RuleSet\RuleSets::getSetDefinitionNames();
        }

        return $this->createRuleSet()->getSetDefinitionNames();
    }

    /**
     * @return \PhpCsFixer\RuleSet\RuleSet|\PhpCsFixer\RuleSet\RuleSet
     */
    private function createRuleSet(array $set = [])
    {
        if (class_exists(RuleSet\RuleSet::class)) {
            return new RuleSet\RuleSet($set);
        }

        return RuleSet::create($set);
    }

    /**
     * @param string $fixerName
     *
     * @return string
     */
    private function getOverrideRequiredPHPVersion($fixerName)
    {
        $phpVersion = $this->getFixerRequiredPHPVersion($fixerName);
        list($major, $minor) = explode('.', $phpVersion);
        $major = (int) $major;
        $minor  = (int) $minor;

        return $major === PHP_MAJOR_VERSION && $minor === PHP_MINOR_VERSION ? '' : $phpVersion;
    }

    /**
     * @param string $fixerName
     *
     * @return string
     */
    private function getFixerRequiredPHPVersion($fixerName)
    {
        if (version_compare($this->getVersion(), '2.15.9') < 0) {
            // SplFixedArray::rewind has been removed in PHP 8.0
            return '7.4';
        }
        switch ($fixerName) {
            case 'binary_operator_spaces':
                // Function utf8_decode() is deprecated
                return version_compare($this->getVersion(), '3.12') < 0 ? '7.4': '8.2';
            case 'clean_namespace':
                // 'syntax error, unexpected token "\", expecting "{"' when parsing 'namespace Foo \ Bar;'
                return '7.4';
            case 'lowercase_cast':
                // The (real) cast has been removed in PHP 8.0
                return '7.4';
            case 'short_scalar_cast':
                // The (real) cast has been removed in PHP 8.0
                return '7.4';
        }

        return '8.2';
    }
}
