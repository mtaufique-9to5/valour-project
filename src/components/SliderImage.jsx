import React from 'react';
import ReactBeforeSliderComponent from 'react-before-after-slider-component';
import 'react-before-after-slider-component/dist/build.css';


const SliderImage = () => {
    const FIRST_IMAGE = {
        imageUrl: '/images/bright-img.png'
    };
    const SECOND_IMAGE = {
        imageUrl: '/images/dull-img.png'
    };
    return (
        <section className='slider-image'>

            <ReactBeforeSliderComponent
                firstImage={FIRST_IMAGE}
                secondImage={SECOND_IMAGE}
            />

        </section>
    )
}

export default SliderImage
