<?php

namespace MLocati\PhpCsFixerConfigurator;

use RuntimeException;

class Docker
{
    const IMAGE_NAME = 'php-cs-configurator';

    /**
     * @param string $command
     * @param string[] $arguments
     *
     * @throws \RuntimeException
     */
    public function run($command, array $arguments = [])
    {
        $invoke = 'docker run --rm -t';
        $invoke .= ' -v ' . escapeshellarg(str_replace('/', DIRECTORY_SEPARATOR, $this->getProjectRootFolder()) . ':/app');
        $invoke .= ' ' . escapeshellarg($this->getImageTag());
        $invoke .= ' ' . escapeshellarg("/app/bin/{$command}");
        foreach ($arguments as $argument) {
            $invoke .= ' ' . escapeshellarg($argument);
        }
        $rc = -1;
        passthru($invoke, $rc);
        if ($rc !== 0) {
            throw new RuntimeException("Command failed!");
        }
    }

    /**
     * @throws \RuntimeException
     *
     * @return string
     */
    private function getImageTag()
    {
        $wantedTag = $this->getWantedHash();
        $availableTags = $this->listImageTags();
        foreach (array_diff($availableTags, [$wantedTag]) as $uselessTag) {
            exec('docker rmi ' . escapeshellarg(static::IMAGE_NAME . ":{$uselessTag}"));
        }
        if (!in_array($wantedTag, $availableTags)) {
            $this->buildImage($wantedTag);
        }

        return static::IMAGE_NAME . ":{$wantedTag}";
    }

    /**
     * @return string
     */
    private function getProjectRootFolder()
    {
        return str_replace(DIRECTORY_SEPARATOR, '/', dirname(__DIR__));
    }

    /**
     * @return string
     */
    private function getDockerfileFolder()
    {
        return $this->getProjectRootFolder() . '/php/assets';
    }

    /**
     * @return string
     */
    private function getDockerfilePath()
    {
        return $this->getDockerfileFolder() . '/Dockerfile';
    }

    /**
     * @throws \RuntimeException
     *
     * @return string
     */
    private function getWantedHash()
    {
        $dockerfile = $this->getDockerfilePath();
        if (!is_file($dockerfile)) {
            throw new RuntimeException("Failed to find the Dockerfile {$dockerfile}");
        }
        $hash = sha1_file($dockerfile);
        if ($hash === false) {
            throw new RuntimeException("Failed to get the hash of the Dockerfile {$dockerfile}");
        }

        return $hash;
    }

    /**
     * @throws \RuntimeException
     *
     * @return string
     */
    private function listImageTags()
    {
        $rc = -1;
        $output = [];
        exec('docker images --format "{{.Tag}}" ' . escapeshellarg(static::IMAGE_NAME) . ' 2>&1', $output, $rc);
        if ($rc !== 0) {
            throw new RuntimeException("Failed to list docker images:\n" . implode("\n", $output));
        }

        return array_values(
            array_filter(
                $output,
                static function($line) {
                    return (string) $line !== '';
                }
            )
        );
    }

    /**
     * @param string $tag
     *
     * @throws \RuntimeException
     */
    private function buildImage($tag)
    {
        $folder = str_replace('/', DIRECTORY_SEPARATOR, $this->getDockerfileFolder());
        $rc = -1;
        passthru('docker build --tag ' . escapeshellarg(static::IMAGE_NAME . ":{$tag}") . ' ' . escapeshellarg($folder), $rc);
        if ($rc !== 0) {
            throw new RuntimeException('Failed to build the docker image');
        }
    }
}
