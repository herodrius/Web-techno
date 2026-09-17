import { useState } from 'react';

const Title = () => {
    const [titre, setTitre] = useState('HELLO WORLD');
    const [count, setCount] = useState(0);
    return (
    <div>
        <h1>{titre}</h1>
        <p>Welcome to my first React app!</p>
        <button onClick={() => setCount(count + 1)}>
            Click me {count} 
        </button>
        <button onClick={() => {
            setTitre('HELLO REACT');
        }}>
            Change Title
        </button>



    </div>
    )
}

export default Title;
