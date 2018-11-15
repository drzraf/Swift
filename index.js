const request = require(`request`)

function isOk(response) {
  return response && 199 < response.statusCode && response.statusCode < 300
}

function onError(reject, error, response) {
  if (error) {
    reject(error)
  } else if (response.body.error) {
    reject(response.body.error)
  } else {
    reject(response.body)
  }
}

module.exports = class Swift {
  constructor(url, data) {
    this.url = url
    this.auth = require("./auth")(url, data)
    this.token = ""
    this.storageUrl = ""
  }

  authenticated() {
    return this.token != "" && this.storageUrl != ""
  }

  unauthenticate() {
    this.token = ""
    this.storageUrl = ""
  }

  async authenticate() {
    let options = {
      url: this.auth.authUrl(this.url),
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      json: this.auth.json()
    }

    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (isOk(response)) {
          this.token = this.auth.token(response)
          this.storageUrl = this.auth.storageUrl(body)
          resolve(this)
        } else {
          onError(reject, error, response)
        }
      })
    })
  }

  async call(url, method, qs, onSuccess) {
    return new Promise((resolve, reject) => {
      request({
        uri: url,
        method: method,
        qs: qs,
        headers: {
          "X-Auth-Token": this.token
        }
      }, (error, response, body) => {
        if (isOk(response)) {
          onSuccess(resolve, body)
        } else {
          onError(reject, error, response)
        }
      })
    })
  }

  async containerNames(options) {
    return this.call(this.storageUrl, "GET", options, (resolve, body) => {
      resolve(body.split("\n").filter(e => e))
    })
  }

  async containers(options = {}) {
    options.format = "json"
    return this.call(this.storageUrl, "GET", options, (resolve, body) => {
      resolve(body)
    })
  }
}
