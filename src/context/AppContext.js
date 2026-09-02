// src/context/AppContext.js

import { createContext, useContext } from 'react';

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext);
};

export default AppContext;
