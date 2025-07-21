import { useState } from 'react';

interface CloneRepositoryData {
    githubOwner: string;
    githubRepo: string;
    githubUrl: string;
    description?: string;
}

interface CloneResponse {
    success: boolean;
    project: any;
    message: string;
}

export const useRepositoryClone = () => {
    const [isCloning, setIsCloning] = useState(false);
    const [cloneError, setCloneError] = useState('');
    const [cloneSuccess, setCloneSuccess] = useState('');

    const cloneRepository = async (data: CloneRepositoryData): Promise<CloneResponse | null> => {
        setIsCloning(true);
        setCloneError('');
        setCloneSuccess('');

        try {
            const response = await fetch('/api/repositories/clone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to clone repository');
            }

            setCloneSuccess(result.message || 'Repository cloned successfully!');
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to clone repository';
            setCloneError(errorMessage);
            return null;
        } finally {
            setIsCloning(false);
        }
    };

    const clearMessages = () => {
        setCloneError('');
        setCloneSuccess('');
    };

    return {
        cloneRepository,
        isCloning,
        cloneError,
        cloneSuccess,
        clearMessages,
    };
};
