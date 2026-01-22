import { Link } from 'react-router-dom'
import { FileText, Clock, CheckCircle, AlertTriangle, Phone, Mail, Globe, Users } from 'lucide-react'

export default function VisaProcessing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <FileText className="h-20 w-20 text-white mx-auto mb-6" />
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight antialiased">Visa Processing Services</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed antialiased">
              Professional visa assistance for Uganda and international travel. Fast, reliable, and hassle-free.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Visa Types */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Visa Services We Offer</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <Globe className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">Uganda Tourist Visa</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Single/Multiple entry visas</li>
                <li>• Processing time: 3-5 business days</li>
                <li>• Validity: Up to 6 months</li>
                <li>• Stay duration: Up to 90 days</li>
              </ul>
              <p className="text-3xl font-black text-black">$85<span className="text-lg font-normal text-gray-600">/visa</span></p>
            </div>

            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <Users className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">East African Tourist Visa</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Kenya, Tanzania, Rwanda access</li>
                <li>• Processing time: 5-7 business days</li>
                <li>• Validity: Up to 90 days</li>
                <li>• Multi-country travel</li>
              </ul>
              <p className="text-3xl font-black text-black">$120<span className="text-lg font-normal text-gray-600">/visa</span></p>
            </div>

            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <FileText className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">Business/Work Visa</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Business meeting visas</li>
                <li>• Work permit applications</li>
                <li>• Investment opportunity visas</li>
                <li>• Extended processing time</li>
              </ul>
              <p className="text-3xl font-black text-black">$150<span className="text-lg font-normal text-gray-600">/visa</span></p>
            </div>

            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <Clock className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">Express Service</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Rush processing (24-48 hours)</li>
                <li>• Priority handling</li>
                <li>• Additional fees apply</li>
                <li>• Emergency situations</li>
              </ul>
              <p className="text-3xl font-black text-black">$250<span className="text-lg font-normal text-gray-600">/visa</span></p>
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-black text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Submit Documents</h3>
              <p className="text-gray-700 leading-snug antialiased">Upload your passport, photos, and application form securely.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-black text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">We Process</h3>
              <p className="text-gray-700 leading-snug antialiased">Our experts handle submission and follow-up with immigration.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-black text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Track Progress</h3>
              <p className="text-gray-700 leading-snug antialiased">Monitor your application status through our dashboard.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-black text-xl">4</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Receive Visa</h3>
              <p className="text-gray-700 leading-snug antialiased">Get your approved visa delivered or ready for pickup.</p>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Document Requirements</h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Required Documents</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Valid passport (6+ months validity)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Recent passport-sized photos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Completed application form</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Flight itinerary or travel plans</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Additional Requirements</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Proof of accommodation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Bank statements (for longer stays)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Invitation letter (if applicable)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Medical certificate (if required)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Important Notice</h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Processing Times</h3>
                <p className="text-gray-700 leading-snug antialiased">Processing times may vary based on your nationality and current workload at immigration offices.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Fees & Refunds</h3>
                <p className="text-gray-700 leading-snug antialiased">All fees are non-refundable once processing begins. Additional documents may be requested during processing.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Visa Approval</h3>
                <p className="text-gray-700 leading-snug antialiased">Visa approval is at the discretion of immigration authorities. We assist with applications but cannot guarantee approval.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Need Help with Visa Processing?</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Contact Our Team</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 font-medium">+256 414 320 000</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 font-medium">visas@dirtrails.com</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Quick Actions</h3>
              <div className="space-y-4">
                <Link to="/contact" className="flex items-center text-black hover:text-gray-700 transition-colors">
                  <FileText className="h-6 w-6 mr-4" />
                  <span className="font-medium">Start Application</span>
                </Link>
                <Link to="/help" className="flex items-center text-black hover:text-gray-700 transition-colors">
                  <Phone className="h-6 w-6 mr-4" />
                  <span className="font-medium">Get Support</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}