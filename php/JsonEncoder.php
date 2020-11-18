<?php
namespace MLocati\PhpCsFixerConfigurator;

use Exception;
use MLocati\PhpCsFixerConfigurator\ExtractedData\EmptyArrayValue;

class JsonEncoder
{
    /**
     * @var string
     */
    const INDENT = '    ';

    /**
     * @var bool
     */
    private $prettyPrint = false;

    /**
     * @return bool
     */
    public function isPrettyPrint()
    {
        return $this->prettyPrint;
    }

    /**
     * @param bool $prettyPrint
     */
    public function setPrettyPrint($value)
    {
        $this->prettyPrint = (bool) $value;

        return $this;
    }

    /**
     * @param mixed $value
     *
     * @throws \Exception
     *
     * @return string
     */
    public function stringify($value)
    {
        return $this->stringifyValue($value, '');
    }

    /**
     * @param mixed $value
     * @param string $prefix
     * @param string $oneTimePrefix
     *
     * @throws \Exception
     *
     * @return string
     */
    protected function stringifyValue($value, $prefix, $oneTimePrefix = '')
    {
        $type = gettype($value);
        switch ($type) {
            case 'boolean':
            case 'integer':
            case 'double':
            case 'string':
            case 'NULL':
                return $prefix . $oneTimePrefix . json_encode($value);
            case 'array':
                return $this->stringifyArray($value, $prefix, $oneTimePrefix);
            case 'object':
                $className = get_class($value);
                switch ($className) {
                    case EmptyArrayValue::class:
                        return $this->stringifyEmptyArrayValue($value, $prefix, $oneTimePrefix);
                        break;
                }
                throw new Exception("Unable to create a JSON representation of {$className}");
            default:
        }
        throw new Exception("Unable to create a JSON representation of {$type}");
    }

    /**
     * @param string $prefix
     * @param string $oneTimePrefix
     *
     * @throws \Exception
     *
     * @return string
     */
    protected function stringifyArray(array $value, $prefix, $oneTimePrefix = '')
    {
        $count = count($value);
        if ($count === 0) {
            return $prefix . $oneTimePrefix . '[]';
        }
        $prettyPrint = $this->isPrettyPrint();
        $subIndent = $prettyPrint ? $prefix . static::INDENT : '';
        $newline = $prettyPrint ? "\n" : '';
        if (array_keys($value) === range(0, $count - 1)) {
            $result = $prefix . $oneTimePrefix . '[';
            $first = true;
            foreach ($value as $item) {
                if ($first === true) {
                    $first = false;
                } else {
                    $result .= ',';
                }
                $result .= $newline . $this->stringifyValue($item, $subIndent);
            }
            $result .= $newline . $prefix . ']';

            return $result;
        } else {
            $afterKey = $prettyPrint ? ': ' : ':';
            $result = $prefix . $oneTimePrefix . '{';
            $first = true;
            foreach ($value as $key => $item) {
                if ($first === true) {
                    $first = false;
                } else {
                    $result .= ',';
                }
                $result .= $newline . $this->stringifyValue($item, $subIndent, json_encode($key) . $afterKey);
            }
            $result .= $newline . $prefix . '}';

            return $result;
        }
    }

    /**
     * @param string $prefix
     * @param string $oneTimePrefix
     *
     * @return string
     */
    protected function stringifyEmptyArrayValue(EmptyArrayValue $value, $prefix, $oneTimePrefix)
    {
        switch ($value->getJsonKind()) {
            case EmptyArrayValue::JSONKIND_OBJECT:
                return $prefix . $oneTimePrefix . '{}';
            case EmptyArrayValue::JSONKIND_ARRAY:
            default:
                return $prefix . $oneTimePrefix . '[]';
        }
    }
}
