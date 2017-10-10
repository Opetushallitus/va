import { expect } from 'chai'
import SyntaxValidator from '../form/SyntaxValidator'

describe('Syntax validator', function() {
  it('can validate a normal finnish business id', function() {
    expect(SyntaxValidator.validateBusinessId("1629284-5")).to.equal(undefined)
  })
  it('can validate a finnish business id with 0 checksum', function() {
    expect(SyntaxValidator.validateBusinessId("0165761-0")).to.equal(undefined)
  })
  it('can validate a finnish business id with 1 checksum', function() {
    expect(SyntaxValidator.validateBusinessId("0208201-1")).to.equal(undefined)
  })
  it('notices wrong format of finnish business id', function() {
    const result = SyntaxValidator.validateBusinessId("165761-0")
    expect(result).to.have.property("error")
    expect(result.error).to.equal("finnishBusinessId")
  })
  it('notices wrong checksum in finnish business id', function() {
    const result = SyntaxValidator.validateBusinessId("1629284-6")
    expect(result).to.have.property("error")
    expect(result.error).to.equal("finnishBusinessId")
  })
  it('validates email', function() {
    expect(SyntaxValidator.validateEmail("user@example.com")).to.equal(undefined)
    expect(SyntaxValidator.validateEmail("first.last@example.com")).to.equal(undefined)
    expect(SyntaxValidator.validateEmail("First.LAST@example.com")).to.equal(undefined)
    expect(SyntaxValidator.validateEmail("valid.email@my-example.DOT.com")).to.equal(undefined)
    expect(SyntaxValidator.validateEmail("valid+param@example.com")).to.equal(undefined)
    expect(SyntaxValidator.validateEmail("nosuch")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("invalid@example")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("invalid@example,com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("invalid@example.,com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("first last@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("first. last@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("first .last@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("äö@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("invalid.em%0Ail@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("invalid.em%0ail@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail(" user@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail(";user@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("user@example.com ")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("user@example.com;")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("Matti Meikalainen <matti@example.com>")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("Matti Meikälainen <matti@example.com>")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("user1@example.com user2@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("user1@example.com, user2@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("user1@example.com; user2@example.com")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail("")).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail(42)).to.eql({error: "email"})
    expect(SyntaxValidator.validateEmail(null)).to.eql({error: "email"})
  })
})
