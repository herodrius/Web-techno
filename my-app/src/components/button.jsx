import { useState } from 'react';

const Title = () => {

    const [count, setCount] = useState(0);
    return (
    <div>
        <h1>HELLO WORLD</h1>
        <p>Welcome to my first React app!</p>
        <button onClick={() => setCount(count + 1)}>
            Click me {count} 
        </button>
        <p>You clicked {count} times</p>
    </div>
    )
}

export default Title;
