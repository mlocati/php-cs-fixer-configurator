<?php
namespace MLocati\PhpCsFixerConfigurator;

use PhpCsFixer\ConfigurationException\InvalidFixerConfigurationException;
use PhpCsFixer\ConfigurationException\RequiredFixerConfigurationException;
use PhpCsFixer\Console\Application;
use PhpCsFixer\Fixer\ConfigurableFixerInterface;
use PhpCsFixer\Fixer\ConfigurationDefinitionFixerInterface;
use PhpCsFixer\Fixer\DefinedFixerInterface;
use PhpCsFixer\FixerDefinition\FileSpecificCodeSampleInterface;
use PhpCsFixer\FixerFactory;
use PhpCsFixer\RuleSet;
use PhpCsFixer\StdinFileInfo;
use PhpCsFixer\Tokenizer\Tokens;

class DataExtractor
{
    /**
     * Get the PHP-CS-Fixer version.
     *
     * @return string
     */
    public function getVersion()
    {
        return Application::VERSION;
    }

    public function getFixers()
    {
        $result = [];
        $factory = FixerFactory::create()->registerBuiltInFixers();
        foreach ($factory->getFixers() as $fixer) {
            $fixerData = [];
            if ($fixer->isRisky()) {
                $fixerData['risky'] = true;
            }
            if ($fixer instanceof ConfigurationDefinitionFixerInterface) {
                foreach ($fixer->getConfigurationDefinition()->getOptions() as $option) {
                    $o = [
                        'name' => $option->getName(),
                    ];
                    $s = (string) $option->getDescription();
                    if ($s !== '') {
                        $o['description'] = $s;
                    }
                    if ($option->hasDefault()) {
                        $o['defaultValue'] = $option->getDefault();
                    }
                    $allowedTypes = $option->getAllowedTypes();
                    if ($allowedTypes !== null) {
                        $o['allowedTypes'] = $allowedTypes;
                    }
                    $allowedValues = $option->getAllowedValues();
                    if ($allowedValues !== null) {
                        foreach ($allowedValues as $allowedValue) {
                            if ($allowedValue !== null && !is_scalar($allowedValue)) {
                                $allowedValues = null;
                                break;
                            }
                        }
                        if ($allowedValues !== null) {
                            $o['allowedValues'] = $allowedValues;
                        }
                    }
                    if (!isset($fixerData['configuration'])) {
                        $fixerData['configuration'] = [];
                    }
                    $fixerData['configuration'][] = $o;
                }
            }
            if ($fixer instanceof DefinedFixerInterface) {
                $definition = $fixer->getDefinition();
                $s = (string) $definition->getSummary();
                if ($s !== '') {
                    $fixerData['summary'] = $s;
                }
                $s = (string) $definition->getDescription();
                if ($s !== '') {
                    $fixerData['description'] = $s;
                }
                $s = (string) $definition->getRiskyDescription();
                if ($s !== '') {
                    $fixerData['riskyDescription'] = $s;
                }
                foreach ($definition->getCodeSamples() as $codeSample) {
                    $old = $codeSample->getCode();
                    $configuration = $codeSample->getConfiguration();
                    $new = null;
                    try {
                        $tokens = Tokens::fromCode($old);
                    } catch (\Exception $x) {
                        $new = '*** Tokens::fromCode failed *** ';
                    } catch (\Throwable $x) {
                        $new = '*** Tokens::fromCode failed *** ';
                    }
                    if ($new === null) {
                        if ($fixer instanceof ConfigurableFixerInterface) {
                            try {
                                $fixer->configure($configuration);
                            } catch (RequiredFixerConfigurationException $x) {
                                $new = '*** RequiredFixerConfigurationException ***';
                            } catch (InvalidFixerConfigurationException $x) {
                                $new = '*** InvalidFixerConfigurationException ***';
                            }
                        }
                        if ($new === null) {
                            $file = $codeSample instanceof FileSpecificCodeSampleInterface ? $codeSample->getSplFileInfo() : new StdinFileInfo();
                            $fixer->fix($file, $tokens);
                            $new = $tokens->generateCode();
                        }
                    }
                    if (!isset($fixerData['codeSamples'])) {
                        $fixerData['codeSamples'] = [];
                    }
                    $codeSampleData = [
                        'from' => $old,
                        'to' => $new,
                    ];
                    if ($configuration !== null) {
                        $codeSampleData['configuration'] = $configuration;
                    }
                    $fixerData['codeSamples'][] = $codeSampleData;
                }
            }
            $result[$fixer->getName()] = $fixerData;
        }

        return $result;
    }

    public function getSets()
    {
        $result = [];
        $setNames = RuleSet::create()->getSetDefinitionNames();
        foreach ($setNames as $setName) {
            $ruleSet = RuleSet::create([$setName => true]);
            $config = [];
            foreach ($ruleSet->getRules() as $ruleName => $ruleConfiguration) {
                $config[$ruleName] = $ruleConfiguration === true ? null : $ruleConfiguration;
            }
            $result[$setName] = $config;
        }

        return $result;
    }
}
