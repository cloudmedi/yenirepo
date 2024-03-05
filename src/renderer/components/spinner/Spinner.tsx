import React, { useState, ChangeEvent } from 'react';
import './Style.css'

const Spinner = () => {
  return (
    <div className="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  );
};

export default Spinner;