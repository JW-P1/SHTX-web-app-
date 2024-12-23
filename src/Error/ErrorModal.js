import React, { useContext } from 'react';
import { ErrorContext } from './ErrorContext';
import CustomModal from './CustomModal';

function ErrorModal() {
  const { error, hideError } = useContext(ErrorContext);

  return (
    <CustomModal
      isOpen={Boolean(error)}
      onClose={hideError}
      message={error}
    />
  );
}

export default ErrorModal;
