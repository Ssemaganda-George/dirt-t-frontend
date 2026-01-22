import { Link } from 'react-router-dom'
import { GraduationCap, Calendar, Clock, Users, CheckCircle, AlertTriangle, Phone, Mail, BookOpen } from 'lucide-react'

export default function HospitalityClass() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <GraduationCap className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Hospitality Training Classes</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional hospitality training programs designed for Uganda's tourism industry. Build skills, advance your career, and join our growing community of hospitality professionals.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Course Offerings */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Training Programs</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Hospitality Fundamentals</h3>
              </div>
              <ul className="space-y-2 text-gray-600 mb-4">
                <li>• Customer service excellence</li>
                <li>• Front desk operations</li>
                <li>• Housekeeping standards</li>
                <li>• Food & beverage basics</li>
                <li>• 4-week intensive program</li>
              </ul>
              <p className="text-2xl font-bold text-blue-600">$150<span className="text-sm font-normal">/person</span></p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Tourism Management</h3>
              </div>
              <ul className="space-y-2 text-gray-600 mb-4">
                <li>• Tour operations</li>
                <li>• Client relationship management</li>
                <li>• Safety & risk management</li>
                <li>• Cultural tourism</li>
                <li>• 6-week comprehensive course</li>
              </ul>
              <p className="text-2xl font-bold text-blue-600">$250<span className="text-sm font-normal">/person</span></p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <GraduationCap className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Advanced Hospitality</h3>
              </div>
              <ul className="space-y-2 text-gray-600 mb-4">
                <li>• Leadership & management</li>
                <li>• Revenue optimization</li>
                <li>• Quality assurance</li>
                <li>• Digital marketing</li>
                <li>• 8-week executive program</li>
              </ul>
              <p className="text-2xl font-bold text-blue-600">$400<span className="text-sm font-normal">/person</span></p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Calendar className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Specialized Workshops</h3>
              </div>
              <ul className="space-y-2 text-gray-600 mb-4">
                <li>• Wine & beverage pairing</li>
                <li>• Cultural experiences</li>
                <li>• Sustainable tourism</li>
                <li>• Crisis management</li>
                <li>• 1-2 day intensive sessions</li>
              </ul>
              <p className="text-2xl font-bold text-blue-600">$75<span className="text-sm font-normal">/person</span></p>
            </div>
          </div>
        </div>

        {/* Program Benefits */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Our Training?</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Industry Experts</h3>
              <p className="text-gray-600">Learn from experienced hospitality professionals with decades of industry experience.</p>
            </div>

            <div className="text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Practical Training</h3>
              <p className="text-gray-600">Hands-on learning with real-world scenarios and industry-standard equipment.</p>
            </div>

            <div className="text-center">
              <GraduationCap className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Certified Programs</h3>
              <p className="text-gray-600">Internationally recognized certifications that enhance your career prospects.</p>
            </div>
          </div>
        </div>

        {/* Class Schedule */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Class Schedule</h2>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Hospitality Fundamentals</h3>
                  <p className="text-gray-600">Next intake: January 15, 2026</p>
                  <p className="text-sm text-gray-500">Kampala Training Center • 4 weeks • Mon-Fri 9AM-4PM</p>
                </div>
                <div className="mt-4 md:mt-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    8 seats available
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Tourism Management</h3>
                  <p className="text-gray-600">Next intake: February 1, 2026</p>
                  <p className="text-sm text-gray-500">Entebbe Campus • 6 weeks • Tue-Sat 10AM-3PM</p>
                </div>
                <div className="mt-4 md:mt-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    5 seats available
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Advanced Hospitality</h3>
                  <p className="text-gray-600">Next intake: March 10, 2026</p>
                  <p className="text-sm text-gray-500">Kampala Training Center • 8 weeks • Mon-Fri 9AM-5PM</p>
                </div>
                <div className="mt-4 md:mt-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Waitlist only
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Career Opportunities */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Career Opportunities</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Entry-Level Positions</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Front desk receptionist</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Housekeeping staff</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Restaurant server</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Tour guide assistant</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Positions</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-600">Hotel manager</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-600">Restaurant manager</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-600">Tour operations manager</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-gray-600">Hospitality consultant</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Program Requirements</h3>
              <ul className="text-yellow-700 space-y-1">
                <li>• Minimum age: 18 years</li>
                <li>• Basic English proficiency required</li>
                <li>• Commitment to complete the full program</li>
                <li>• Valid ID and proof of residence</li>
                <li>• Some programs require prior experience</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ready to Start Your Hospitality Career?</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-600">+256 414 320 000</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-600">training@dirtrails.com</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-600">Mon-Fri 8AM-6PM</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/contact" className="flex items-center text-blue-600 hover:text-blue-800">
                  <GraduationCap className="h-5 w-5 mr-3" />
                  Apply Now
                </Link>
                <Link to="/help" className="flex items-center text-blue-600 hover:text-blue-800">
                  <BookOpen className="h-5 w-5 mr-3" />
                  Program Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}