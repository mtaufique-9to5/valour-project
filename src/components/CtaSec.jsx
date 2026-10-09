import React from 'react'

const CtaSec = () => {
  return (
    <section className='cta-sec'>
      <div className="container">
        <div className="row">
            <div className="col-md-5">
                <h2>Subscribe to Our News letter</h2>
                <p className='main-para'>Welcome to this month's newsletter! Explore our latest updates, exciting news, and upcoming events. Thank you for being part of our community.</p>
            </div>
            <div className="col-md-5">
                <form className="input-box">
                    <input type="email" placeholder='Enter Email Address'/>
                    <button type='submit'>Submit</button>
                </form>
            </div>
        </div>
      </div>
    </section>
  )
}

export default CtaSec
