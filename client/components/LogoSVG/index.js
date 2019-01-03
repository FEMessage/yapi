import React from 'react';
import PropTypes from 'prop-types';

const LogoSVG = props => {
  let length = props.length;
  return (
    <img src="https://deepexi.oss-cn-shenzhen.aliyuncs.com/dapi/DAPI.svg" width={length}/>
  );
};

LogoSVG.propTypes = {
  length: PropTypes.any
};

export default LogoSVG;
