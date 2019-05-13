<?php
namespace MLocati\PhpCsFixerConfigurator\ExtractedData;

class EmptyArrayValue
{
    /**
     * @var int
     */
    const JSONKIND_OBJECT = 1;

    /**
     * @var int
     */
    const JSONKIND_ARRAY = 2;

    /**
     * @var int|null
     */
    private $jsonKind;

    /**
     * @return int|null
     */
    public function getJsonKind()
    {
        return $this->jsonKind;
    }

    /**
     * @param int|null $value
     *
     * @return $this
     */
    public function setJsonKind($value)
    {
        $this->jsonKind = (string) $value === '' ? null : (int) $value;
    }
}
