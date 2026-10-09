import Link from 'next/link'
import React from 'react'
import { BsInstagram, BsTwitter, BsYoutube } from 'react-icons/bs'
import { FaFacebook } from 'react-icons/fa6'

const IconBox = () => {
    return (
        <div className="icon-box">
            <Link href="#"><FaFacebook /></Link>
            <Link href="#"><BsTwitter /></Link>
            <Link href="#"><BsInstagram /></Link>
            <Link href="#"><BsYoutube /></Link>
        </div>
    )
}

export default IconBox
