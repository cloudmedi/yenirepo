import React, { useState, ChangeEvent } from 'react';
import './Style.css'

interface CustomTextInputProps {
  label: string;
  value: string;
  type: string;
  onChange: (value: string) => void;
}

const CustomTextInput: React.FC<CustomTextInputProps> = ({ label, value, type, onChange }) => {

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="input-group">
      <input type={type} className="input" value={value} required onChange={handleInputChange} />
      <label className="input-label">{label}</label>
    </div>
  );
};

export default CustomTextInput;