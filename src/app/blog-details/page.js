import BlogDetails from '@/components/BlogDetails'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import React from 'react'
import "./b-details.css"
import "../blog/blog.css"

const blogDetailsPage = () => {
  return (
    <>

      <Header />
      <BlogDetails />
      <Footer />
    </>
  )
}

export default blogDetailsPage